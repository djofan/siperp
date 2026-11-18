<?php

namespace App\Modules\Keuangan\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

/** Explicit local CLI import. Never executes SQL, creates identities, grants access or posts money. */
class LegacyFinanceImport
{
    private const TARGETS = ['sources' => 'sources', 'categories' => 'categories', 'approval_settings' => 'approval_rules', 'expenses' => 'expenses', 'approval' => 'approvals'];

    public function guard(): void
    {
        $connection = config('database.default');
        $database = config("database.connections.$connection.database");
        if (! app()->environment('local', 'testing') || $connection !== 'sqlite' || config("database.connections.$connection.url") || ($database !== ':memory:' && ! str_starts_with(basename((string) $database), 'keuangan-import-'))) {
            throw new RuntimeException('Import hanya diizinkan pada SQLite lokal terisolasi bernama keuangan-import-*.sqlite.');
        }
    }

    private function hash(array $row): string
    {
        ksort($row);

        return hash('sha256', json_encode($row, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }

    private function id(string $origin, string $table, string $id): string
    {
        return hash('sha256', "$origin:$table:$id");
    }

    private function fail(bool $condition, string $message): void
    {
        if ($condition) {
            throw new RuntimeException($message);
        }
    }

    private function amount(mixed $value): string
    {
        $this->fail(! is_string($value) || ! preg_match('/^(0|[1-9][0-9]{0,15})$/D', $value) || strlen($value) > 16 || (strlen($value) === 16 && strcmp($value, '9000000000000000') > 0), 'Nominal bukan rupiah integer dalam batas modul.');

        return $value;
    }

    private function add(string $left, string $right): string
    {
        $carry = 0;
        $result = '';
        for ($a = strlen($left) - 1, $b = strlen($right) - 1; $a >= 0 || $b >= 0 || $carry; $a--, $b--) {
            $sum = ($a >= 0 ? (int) $left[$a] : 0) + ($b >= 0 ? (int) $right[$b] : 0) + $carry;
            $result = ($sum % 10).$result;
            $carry = intdiv($sum, 10);
        }

        return $result;
    }

    private function timestamp(mixed $value, string $zone): ?string
    {
        if ($value === null) {
            return null;
        }
        $this->fail(! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D', $value), 'Timestamp sumber tidak valid.');
        $date = CarbonImmutable::createFromFormat('!Y-m-d H:i:s', $value, $zone);
        $this->fail(! $date || $date->format('Y-m-d H:i:s') !== $value, 'Timestamp sumber tidak valid.');

        return $date->utc()->format('Y-m-d H:i:s');
    }

    private function fingerprint(string $table, string $id): ?string
    {
        $row = DB::table('keuangan_'.self::TARGETS[$table])->where('id', $id)->first();
        if (! $row) {
            return null;
        }
        $values = array_map(fn ($v) => $v === null ? null : (string) $v, (array) $row);
        if ($table === 'approval_settings') {
            $values['approvers'] = DB::table('keuangan_rule_approvers')->where('rule_id', $id)->orderBy('user_id')->pluck('user_id')->all();
        }

        return $this->hash($values);
    }

    public function run(array $snapshot, array $mapping, bool $apply = false, ?string $reviewHash = null): array
    {
        $this->guard();
        Validator::make($snapshot, [
            'format' => 'required|in:keuangan-legacy-v1', 'origin' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9_-]*$/D'],
            'timezone' => 'required|timezone', 'dumpSha256' => 'required|size:64|regex:/^[a-f0-9]+$/D', 'tables' => 'required|array',
        ])->validate();
        $origin = $snapshot['origin'];
        $zone = $snapshot['timezone'];
        $tables = [];
        foreach (['sources', 'categories', 'approval_settings', 'expenses', 'approval', 'guarantors', 'approval_statuses', 'users'] as $table) {
            $this->fail(! isset($snapshot['tables'][$table]) || ! is_array($snapshot['tables'][$table]), 'Tabel sumber tidak lengkap: '.$table);
            $tables[$table] = [];
            foreach ($snapshot['tables'][$table] as $row) {
                $id = $row['id'] ?? null;
                $this->fail(! is_string($id) || ! preg_match('/^[1-9][0-9]{0,19}$/D', $id) || isset($tables[$table][$id]), 'ID sumber duplikat/tidak valid: '.$table);
                $tables[$table][$id] = $row;
            }
        }
        $mapped = [];
        $errors = [];
        $warnings = [];
        $targets = [];
        $total = '0';
        $ranges = [];
        $masterNames = [];
        foreach ($mapping as $old => $user) {
            if ($user === null || $user === '') {
                continue;
            }
            $this->fail(! isset($tables['users'][$old]) || ! is_string($user) || ! DB::table('users')->where('id', $user)->exists(), 'Mapping akun tidak valid: '.$old);
            $this->fail(in_array($user, $mapped, true), 'Dua identitas lama dipetakan ke akun yang sama.');
            $mapped[(string) $old] = $user;
        }
        $refer = function (string $table, mixed $id) use ($tables, $origin): string {
            $this->fail(! is_string($id) || ! isset($tables[$table][$id]), 'Referensi sumber tidak ditemukan: '.$table);

            return $this->id($origin, $table, $id);
        };
        foreach (self::TARGETS as $table => $target) {
            foreach ($tables[$table] as $old => $row) {
                $id = $this->id($origin, $table, (string) $old);
                $created = $this->timestamp($row['created_at'] ?? null, $zone);
                $updated = $this->timestamp($row['updated_at'] ?? null, $zone);
                $values = ['id' => $id, 'created_at' => $created, 'updated_at' => $updated];
                $approvers = [];
                $legacyUser = null;
                if (in_array($table, ['sources', 'categories'], true)) {
                    Validator::make($row, ['name' => 'required|string|max:255'])->validate();
                    $values['name'] = $row['name'];
                    $nameKey = $table.':'.mb_strtolower(trim($row['name']));
                    if (isset($masterNames[$nameKey])) {
                        $warnings[] = "$table:$old duplicate_source_name_with:".$masterNames[$nameKey];
                    } else {
                        $masterNames[$nameKey] = (string) $old;
                    }
                } elseif ($table === 'approval_settings') {
                    $min = $this->amount($row['from_amount'] ?? null);
                    $max = $this->amount($row['to_amount'] ?? null);
                    $this->fail((int) $min > (int) $max, 'Rentang aturan tidak valid.');
                    foreach ($ranges as [$from, $to]) {
                        $this->fail((int) $min <= $to && (int) $max >= $from, 'Aturan sumber tumpang tindih.');
                    }
                    $ranges[] = [(int) $min, (int) $max];
                    $this->fail(! array_filter($tables['guarantors'], fn ($g) => ($g['approval_setting_id'] ?? null) === (string) $old), 'Aturan sumber tanpa guarantor.');
                    $values += ['min_amount' => $min, 'max_amount' => $max, 'active' => false, 'version' => 1];
                    foreach ($tables['guarantors'] as $g) {
                        if (($g['approval_setting_id'] ?? null) === (string) $old) {
                            $uid = $g['user_id'] ?? '';
                            if (! isset($mapped[$uid])) {
                                $errors[] = 'users:'.$uid.' mapping_required';
                            } else {
                                $approvers[] = $mapped[$uid];
                            }
                        }
                    }
                    $this->fail(count($approvers) !== count(array_unique($approvers)), 'Guarantor duplikat.');
                    sort($approvers);
                } elseif ($table === 'expenses') {
                    Validator::make($row, ['recipient' => 'required|string|max:255', 'description' => 'present|nullable|string'])->validate();
                    $this->fail($created === null || $updated === null, 'Timestamp pengeluaran kosong.');
                    $amount = $this->amount($row['amount'] ?? null);
                    $total = $this->add($total, $amount);
                    $values += ['source_id' => $refer('sources', $row['source_id'] ?? null), 'category_id' => $refer('categories', $row['category_id'] ?? null), 'recipient' => $row['recipient'], 'description' => $row['description'] ?? '', 'amount' => $amount, 'created_by' => null, 'origin' => 'legacy', 'revision' => 1, 'version' => 1];
                } else {
                    $uid = $row['user_id'] ?? '';
                    $status = $row['approval_status_id'] ?? '';
                    $this->fail(! isset($tables['users'][$uid]) || ! isset($tables['approval_statuses'][$status]), 'Referensi akun/status approval tidak valid.');
                    $legacyUser = ['id' => $uid, 'name' => $tables['users'][$uid]['name'] ?? null];
                    $decision = match (strtolower($tables['approval_statuses'][$status]['name'] ?? '')) {
                        'waiting' => 'waiting', 'approved' => 'approved', 'rejected' => 'rejected', default => null
                    };
                    $this->fail($decision === null || $created === null || $updated === null, 'Status/timestamp approval tidak dikenal.');
                    if (! isset($mapped[$uid])) {
                        $errors[] = 'users:'.$uid.' mapping_required';
                    }
                    $values += ['expense_id' => $refer('expenses', $row['expense_id'] ?? null), 'assigned_user_id' => $mapped[$uid] ?? '', 'decision' => $decision, 'note' => $row['note'] ?? null, 'legacy_updated_at' => $updated, 'revision' => 1, 'version' => 1, 'rule_snapshot' => null, 'cancel_reason' => 'legacy_import'];
                }
                $targets[$id] = ['table' => $table, 'old' => (string) $old, 'values' => $values, 'approvers' => $approvers, 'legacyUser' => $legacyUser,
                    'sourceHash' => $this->hash(['row' => $row, 'values' => $values, 'approvers' => $approvers, 'timezone' => $zone, 'legacyUser' => $legacyUser])];
            }
        }
        $pairs = [];
        foreach ($tables['approval'] as $row) {
            $pair = $row['expense_id'].':'.$row['user_id'];
            $this->fail(isset($pairs[$pair]), 'Penugasan expense/user duplikat.');
            $pairs[$pair] = true;
        }
        foreach ($tables['guarantors'] as $row) {
            $refer('approval_settings', $row['approval_setting_id'] ?? null);
            $this->fail(! isset($tables['users'][$row['user_id'] ?? '']), 'Referensi guarantor tidak valid.');
        }
        $snapshotHash = $this->hash($snapshot);
        $mappingHash = $this->hash($mapping);
        $dumpHash = $snapshot['dumpSha256'];

        return DB::transaction(function () use ($targets, $origin, $zone, $snapshotHash, $dumpHash, $mappingHash, $apply, $reviewHash, $errors, $warnings, $total) {
            if ($apply) {
                DB::table('modules')->where('slug', 'keuangan')->lockForUpdate()->firstOrFail();
            }
            $counts = ['added' => 0, 'unchanged' => 0, 'changed' => 0, 'missing' => 0];
            $new = [];
            foreach ($targets as $id => $target) {
                if (in_array($target['table'], ['sources', 'categories'], true) && DB::table('keuangan_'.$target['table'])->where('name', $target['values']['name'])->where('id', '!=', $id)->whereNotIn('id', DB::table('keuangan_legacy_links')->where('origin', $origin)->where('legacy_table', $target['table'])->select('target_id'))->exists()) {
                    $errors[] = $target['table'].':'.$target['old'].' master_name_conflict';
                }
                $link = DB::table('keuangan_legacy_links')->where('id', $id)->first();
                $actual = $this->fingerprint($target['table'], $id);
                if (! $link) {
                    if ($actual !== null) {
                        $errors[] = $target['table'].':'.$target['old'].' target_collision';
                    }
                    $counts['added']++;
                    $new[$id] = $target;
                } elseif ($link->source_hash !== $target['sourceHash']) {
                    $counts['changed']++;
                    $errors[] = $target['table'].':'.$target['old'].' source_changed';
                } elseif ($actual !== $link->target_hash) {
                    $errors[] = $target['table'].':'.$target['old'].' target_modified';
                } else {
                    $counts['unchanged']++;
                }
            }
            foreach (DB::table('keuangan_legacy_links')->where('origin', $origin)->get() as $link) {
                if (! isset($targets[$link->id])) {
                    $counts['missing']++;
                    $errors[] = $link->legacy_table.':'.$link->legacy_id.' missing_from_source';
                }
            }
            sort($errors);
            $errors = array_values(array_unique($errors));
            $summary = ['counts' => $counts, 'expenseTotalRupiah' => $total, 'conflicts' => $errors, 'warnings' => $warnings, 'snapshotHash' => $snapshotHash, 'mappingHash' => $mappingHash];
            $summary['reviewHash'] = $this->hash($summary);
            if (! $apply) {
                return $summary;
            }
            $this->fail(count($errors) > 0 || ! $reviewHash || ! hash_equals($summary['reviewHash'], $reviewHash), 'Impor diblokir: konflik atau token pratinjau berubah. Jalankan dry-run kembali.');
            if (! $new) {
                return [...$summary, 'applied' => false];
            }
            $batch = (string) Str::uuid();
            DB::table('keuangan_import_batches')->insert(['id' => $batch, 'origin' => $origin, 'snapshot_hash' => $snapshotHash, 'dump_hash' => $dumpHash, 'mapping_hash' => $mappingHash, 'timezone' => $zone, 'summary' => json_encode($summary, JSON_THROW_ON_ERROR), 'completed_at' => now()->utc()]);
            foreach ($new as $id => $target) {
                $values = $target['values'];
                if ($target['table'] === 'approval') {
                    $values['cancelled_at'] = now()->utc();
                }
                DB::table('keuangan_'.self::TARGETS[$target['table']])->insert($values);
                if ($target['table'] === 'approval_settings') {
                    foreach ($target['approvers'] as $uid) {
                        DB::table('keuangan_rule_approvers')->insert(['rule_id' => $id, 'user_id' => $uid]);
                    }
                }
                if ($target['table'] === 'approval') {
                    DB::table('keuangan_approval_events')->insert(['id' => (string) Str::uuid(), 'approval_id' => $id, 'actor_id' => null, 'action' => 'imported_baseline', 'origin' => 'legacy', 'changes' => json_encode(['decision' => $values['decision'], 'legacyUser' => $target['legacyUser'], 'legacyUpdatedAt' => $values['legacy_updated_at'], 'batchId' => $batch], JSON_THROW_ON_ERROR), 'reason' => 'Baseline impor; bukan keputusan baru.', 'recorded_at' => now()->utc()]);
                }
                DB::table('keuangan_legacy_links')->insert(['id' => $id, 'origin' => $origin, 'legacy_table' => $target['table'], 'legacy_id' => $target['old'], 'target_id' => $id, 'source_hash' => $target['sourceHash'], 'target_hash' => $this->fingerprint($target['table'], $id), 'batch_id' => $batch]);
            }

            return [...$summary, 'applied' => true, 'batchId' => $batch];
        }, 3);
    }
}
