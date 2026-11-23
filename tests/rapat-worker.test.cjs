const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tempRoot = path.join(root, '.tmp-uat');
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

function run(scenario) {
  fs.mkdirSync(tempRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(tempRoot, 'rapat-worker-test-'));
  try {
    // Replace only the PHP process and clock: execute the actual wrapper loop.
    const script = fs.readFileSync(path.join(root, 'ops/rapat/run-worker.sh'), 'utf8')
      .replace('/usr/bin/php8.4 -d memory_limit=256M /usr/local/lib/siperp-rapat/worker.php', 'bash "$TEST_ROOT/job.sh"')
      .replace('sleep 5 &', 'sleep 0.05 &');
    fs.writeFileSync(path.join(directory, 'worker.sh'), script);
    const input = `set -Eeuo pipefail
worker_pid=''
cleanup() {
  if [[ "$worker_pid" =~ ^[1-9][0-9]*$ ]]; then
    kill -TERM "$worker_pid" 2>/dev/null || true
    wait "$worker_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
${scenario}
`;
    return spawnSync(bash, ['-s'], {
      input, encoding: 'utf8', cwd: root, timeout: 15000,
      env: { ...process.env, TEST_ROOT: path.relative(root, directory).split(path.sep).join('/') },
    });
  } finally {
    // Only remove the fixture directory we just allocated inside this workspace.
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(tempRoot) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

test('empty queue cycles keep the service alive and TERM stops it cleanly', () => {
  const result = run(`
printf 'printf x >> "$TEST_ROOT/count"\\nsleep 0.05\\n' > "$TEST_ROOT/job.sh"
bash "$TEST_ROOT/worker.sh" &
worker_pid=$!
for attempt in {1..50}; do
  count=$(wc -c < "$TEST_ROOT/count" 2>/dev/null || echo 0)
  if (( count >= 3 )); then break; fi
  sleep 0.1
done
(( count >= 3 ))
kill -0 "$worker_pid"
kill -TERM "$worker_pid"
wait "$worker_pid"
worker_pid=''
echo CLEAN_STOP
`);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /CLEAN_STOP/);
});

test('child errors retain their exit code for systemd rather than silently looping', () => {
  const result = run(`
printf 'exit 78\\n' > "$TEST_ROOT/job.sh"
bash "$TEST_ROOT/worker.sh" &
worker_pid=$!
code=0
wait "$worker_pid" || code=$?
worker_pid=''
[[ "$code" == 78 ]]
echo EXIT_78_PRESERVED
`);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /EXIT_78_PRESERVED/);
});

test('TERM waits for a running child to finish its graceful shutdown', () => {
  const result = run(`
cat > "$TEST_ROOT/job.sh" <<'SH'
#!/usr/bin/env bash
trap 'sleep 0.1; echo finished > "$TEST_ROOT/finished"; exit 0' TERM
echo ready > "$TEST_ROOT/ready"
while true; do sleep 0.1; done
SH
bash "$TEST_ROOT/worker.sh" &
worker_pid=$!
for attempt in {1..50}; do
  [[ -f "$TEST_ROOT/ready" ]] && break
  sleep 0.1
done
test -f "$TEST_ROOT/ready"
kill -TERM "$worker_pid"
wait "$worker_pid"
worker_pid=''
test -f "$TEST_ROOT/finished"
echo CHILD_FINISHED
`);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /CHILD_FINISHED/);
});
