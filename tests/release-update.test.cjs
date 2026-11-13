const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
const script = fs.readFileSync(path.join(__dirname, '../ops/releases/release.sh'), 'utf8');
// Exercise the actual shell orchestration with mocked services, without sourcing
// root-only production entrypoints or touching /var/www, PM2, Nginx or databases.
const functions = script.slice(script.indexOf('cleanup_obsolete() {'), script.indexOf('case "$ACTION" in'));
function run(scenario) {
  const input = `set -euo pipefail
${functions}
HERE=/tooling
ACTIVE=active-old
PREVIOUS=previous-old
RETIRED=''
SCENARIO=${scenario}
public_health() {
  echo HEALTH_START
  if [[ $SCENARIO == unhealthy ]]; then return 25; fi
}
meta() {
  case "$1" in
    cleanup-candidates)
      if [[ $ACTIVE == active-old && $RETIRED != *obsolete* ]]; then echo obsolete; fi
      if [[ $ACTIVE == new && $RETIRED != *previous-old* ]]; then echo previous-old; fi
      ;;
    active) echo "$ACTIVE" ;;
    status) echo "STATUS:$ACTIVE:$PREVIOUS" ;;
    *) return 50 ;;
  esac
}
retire_release() {
  [[ $1 != "$ACTIVE" && $1 != "$PREVIOUS" && $2 == automatic ]] || return 99
  echo "RETIRE:$1"
  RETIRED="$RETIRED $1"
}
prepare_release() {
  echo "PREPARE:$1"
  if [[ $SCENARIO == prepare-fails ]]; then return 23; fi
  if [[ $SCENARIO == noop ]]; then UPDATE_NOOP=1; return 0; fi
  ID=new
}
record() {
  [[ $1 == new ]] || return 51
  if [[ $SCENARIO == migration ]]; then PHASE=awaiting-migration; else PHASE=ready; fi
}
switch_release() {
  echo "SWITCH:$1:$2"
  if [[ $SCENARIO == switch-fails ]]; then return 24; fi
  [[ $1 == activate && $2 == new ]] || return 52
  PREVIOUS=$ACTIVE
  ACTIVE=new
}
update_release main
echo "FINAL:$ACTIVE:$PREVIOUS"
`;
  const result = spawnSync(bash, ['-s'], { input, encoding: 'utf8', timeout: 10000 });
  if (result.error) throw result.error;
  return result;
}
test('one-command update frees the extra release, activates, then retires only the now-obsolete previous', () => {
  const result = run('success');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RETIRE:obsolete[\s\S]*PREPARE:main[\s\S]*SWITCH:activate:new[\s\S]*RETIRE:previous-old[\s\S]*UPDATE_COMPLETE: new/);
  assert.match(result.stdout, /FINAL:new:active-old/);
});
test('migration review pauses without activation or retiring the rollback target', () => {
  const result = run('migration');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /UPDATE_PAUSED/);
  assert.match(result.stdout, /FINAL:active-old:previous-old/);
  assert.doesNotMatch(result.stdout, /SWITCH:|RETIRE:previous-old|UPDATE_COMPLETE/);
});
test('prepare failure never activates or deletes the previous rollback release', () => {
  const result = run('prepare-fails');
  assert.equal(result.status, 23, result.stderr);
  assert.doesNotMatch(result.stdout, /SWITCH:|RETIRE:previous-old|UPDATE_COMPLETE/);
});
test('switch failure does not perform post-activation cleanup or report completion', () => {
  const result = run('switch-fails');
  assert.equal(result.status, 24, result.stderr);
  assert.doesNotMatch(result.stdout, /RETIRE:previous-old|UPDATE_COMPLETE/);
});
test('already-current update cleans extra processes without replacing the rollback slot', () => {
  const result = run('noop');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RETIRE:obsolete/);
  assert.match(result.stdout, /UPDATE_COMPLETE: active-old \(already up to date\)/);
  assert.match(result.stdout, /FINAL:active-old:previous-old/);
  assert.doesNotMatch(result.stdout, /SWITCH:|RETIRE:previous-old/);
});
test('an unhealthy active service stops update before automatic cleanup or preparation', () => {
  const result = run('unhealthy');
  assert.equal(result.status, 25, result.stderr);
  assert.doesNotMatch(result.stdout, /RETIRE:|PREPARE:|SWITCH:|UPDATE_COMPLETE/);
});
