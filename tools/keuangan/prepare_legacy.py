"""Read a phpMyAdmin dump as data, never execute its SQL. Outputs stay private."""
import argparse
import hashlib
import json
import re
from pathlib import Path

TABLES = {
    'sources': ['id', 'name', 'created_at', 'updated_at'],
    'categories': ['id', 'name', 'created_at', 'updated_at'],
    'expenses': ['id', 'source_id', 'category_id', 'recipient', 'amount', 'description', 'created_at', 'updated_at'],
    'approval': ['id', 'expense_id', 'user_id', 'approval_status_id', 'note', 'created_at', 'updated_at'],
    'approval_settings': ['id', 'from_amount', 'to_amount', 'created_at', 'updated_at'],
    'guarantors': ['id', 'approval_setting_id', 'user_id', 'created_at', 'updated_at'],
    'approval_statuses': ['id', 'name', 'created_at', 'updated_at'],
    'users': ['id', 'name', 'username', 'email'],
}


def statements(sql):
    start, i, quoted = 0, 0, False
    while i < len(sql):
        char = sql[i]
        if quoted:
            if char == '\\':
                i += 2
                continue
            if char == "'":
                if i + 1 < len(sql) and sql[i + 1] == "'":
                    i += 2
                    continue
                quoted = False
        elif char == "'":
            quoted = True
        elif sql.startswith('--', i) or char == '#':
            end = sql.find('\n', i)
            if end < 0:
                return
            # Comments outside literals are whitespace, including before INSERT.
            sql = sql[:i] + ' ' * (end - i) + sql[end:]
            i = end
        elif sql.startswith('/*', i):
            end = sql.find('*/', i + 2)
            if end < 0:
                raise ValueError('Unclosed SQL comment')
            sql = sql[:i] + ' ' * (end + 2 - i) + sql[end + 2:]
            i = end + 1
        elif char == ';':
            yield sql[start:i].strip()
            start = i + 1
        i += 1
    if quoted or sql[start:].strip():
        raise ValueError('Truncated dump or missing final semicolon')


def values(text):
    """Only literal INSERT tuples are accepted; numbers remain decimal strings."""
    i, rows = 0, []
    escapes = {'0': '\0', 'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'Z': '\x1a'}
    while i < len(text):
        if text[i].isspace() or text[i] == ',':
            i += 1
            continue
        if text[i] != '(':
            raise ValueError('Expected literal SQL tuple')
        i += 1
        row = []
        while True:
            while i < len(text) and text[i].isspace():
                i += 1
            if i >= len(text):
                raise ValueError('Truncated tuple')
            if text[i] == "'":
                i += 1
                out = []
                while i < len(text):
                    c = text[i]
                    i += 1
                    if c == '\\':
                        if i >= len(text):
                            raise ValueError('Truncated string escape')
                        out.append(escapes.get(text[i], text[i]))
                        i += 1
                    elif c == "'":
                        if i < len(text) and text[i] == "'":
                            out.append("'")
                            i += 1
                        else:
                            break
                    else:
                        out.append(c)
                else:
                    raise ValueError('Unclosed string')
                value = ''.join(out)
            else:
                match = re.match(r'(NULL|[0-9]+)(?=\s*[,\)])', text[i:], re.I)
                if not match:
                    raise ValueError('SQL expression rejected; only literals accepted')
                value = None if match[1].upper() == 'NULL' else match[1]
                i += len(match[0])
            row.append(value)
            while i < len(text) and text[i].isspace():
                i += 1
            if i >= len(text) or text[i] not in ',)':
                raise ValueError('Invalid tuple delimiter')
            delimiter = text[i]
            i += 1
            if delimiter == ')':
                rows.append(row)
                break
    return rows


def prepare(raw, origin, timezone):
    tables = {name: [] for name in TABLES}
    schemas = set()
    for statement in statements(raw.decode('utf-8-sig')):
        create = re.match(r'CREATE TABLE(?: IF NOT EXISTS)? `([^`]+)`', statement, re.I)
        if create:
            schemas.add(create[1])
        insert = re.match(r'INSERT INTO `([^`]+)`\s*\((.*?)\)\s*VALUES\s*(.*)\Z', statement, re.S | re.I)
        if not insert:
            if re.match(r'(INSERT|REPLACE)\b', statement, re.I):
                raise ValueError('Unsupported INSERT/REPLACE syntax')
            continue
        name = insert[1]
        if name not in TABLES:
            continue
        columns = re.findall(r'`([^`]+)`', insert[2])
        if len(set(columns)) != len(columns) or not set(TABLES[name]).issubset(columns):
            raise ValueError('Unexpected columns for ' + name)
        for row in values(insert[3]):
            if len(row) != len(columns):
                raise ValueError('Column count mismatch for ' + name)
            record = dict(zip(columns, row))
            tables[name].append({key: record[key] for key in TABLES[name]})
    if not set(TABLES).issubset(schemas):
        raise ValueError('Required legacy schemas missing')
    for name, rows in tables.items():
        ids = [row['id'] for row in rows]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate IDs in ' + name)
    return {'format': 'keuangan-legacy-v1', 'origin': origin, 'timezone': timezone,
            'dumpSha256': hashlib.sha256(raw).hexdigest(), 'tables': tables}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dump', type=Path)
    parser.add_argument('--origin', required=True, help='Stable source identity, e.g. keu-insanpeduli')
    parser.add_argument('--timezone', required=True, help='Verified timezone of old SQL timestamps')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    snapshot = prepare(args.dump.read_bytes(), args.origin, args.timezone)
    args.output.mkdir(parents=True, exist_ok=True)
    # Exclusive writes: never overwrite a prior snapshot or reviewed mapping.
    for name in ['snapshot.json', 'accounts.template.json', 'source-audit.json']:
        if (args.output / name).exists():
            raise ValueError('Output already exists; use a fresh private directory')
    files = {
        'snapshot.json': snapshot,
        'accounts.template.json': {row['id']: None for row in snapshot['tables']['users']},
        'source-audit.json': {'dumpSha256': snapshot['dumpSha256'], 'counts': {k: len(v) for k, v in snapshot['tables'].items()},
                              'expenseTotalRupiah': str(sum(int(row['amount']) for row in snapshot['tables']['expenses']))},
    }
    for name, data in files.items():
        with (args.output / name).open('x', encoding='utf-8') as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
    print('Prepared private snapshot, mapping template and aggregate audit. No SQL executed.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        raise SystemExit('Preparation failed. Verify dump format and use a fresh private output directory; no SQL executed.')
