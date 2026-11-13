const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRecord, routing, nextPort, transition, planHash, checkPlan, retireAllowed, cleanupCandidates } = require('../ops/releases/routine.cjs');
const { handoverConfig } = require('../ops/releases/runtime.cjs');
const base = '/var/www/siperp-deploy/releases';
function record(number, phase = 'ready') {
  const commit = String(number).repeat(40), id = `2026111212000${number}-${commit.slice(0, 12)}`;
  return { id, commit, path: `${base}/${id}`, webPort: 3101 + number, apiPort: 8101 + number,
    name: `siperp-release-${id}`, phase, createdAt: '2026-11-01T00:00:00Z' };
}
function registry() {
  const one = record(1, 'active'), two = record(2);
  two.preparedFrom = one.id;
  return { version: 1, active: one.id, previous: null, releases: [one, two] };
}
function route(text, key) {
  const rules = [...text.matchAll(/"~([^"\n]+)" http:\/\/127\.0\.0\.1:(\d+);/g)];
  return Number(rules.find(([, regex]) => new RegExp(regex).test(key))?.[2] ?? text.match(/default http:\/\/127\.0\.0\.1:(\d+);/)[1]);
}
test('initial manager routing exactly matches the already-running baseline handover', () => {
  const id = '20261112115845-f18799e58267';
  const first = { id, commit: 'f18799e58267' + '0'.repeat(28), path: `${base}/${id}`,
    webPort: 3101, apiPort: 8101, name: `siperp-candidate-${id}`, phase: 'active', createdAt: '2026-11-12T12:00:00Z' };
  checkRecord(first);
  assert.equal(routing({ active: id, releases: [first] }).trim(), handoverConfig('proxy_pass http://127.0.0.1:3000;', id).routing.trim());
});
test('unactivated ready releases do not become public routes', () => {
  const r = registry(), [one, two] = r.releases;
  const map = routing(r);
  assert.doesNotMatch(map, new RegExp(two.id));
  assert.equal(route(map, '||||/'), one.webPort);
});
test('switch keeps old navigation/actions/assets on their release and routes new page loads to target', () => {
  const r = registry(), [one, two] = r.releases;
  const map = routing(r, two.id);
  assert.equal(route(map, '||||/'), two.webPort);
  assert.equal(route(map, `${one.id}|||save|/academy`), one.webPort);
  assert.equal(route(map, `|${one.id}|||/_next/static/a.js`), one.webPort);
  assert.equal(route(map, `${two.id}||1||/academy`), two.webPort);
  assert.equal(route(map, '|||legacy-action|/academy'), 3000);
});
test('forward transitions require readiness and the same active source used during prepare', () => {
  const r = registry(), [one, two] = r.releases;
  two.preparedFrom = 'different';
  assert.throws(() => transition(r, two.id), /Invalid/);
  two.preparedFrom = one.id; two.phase = 'building';
  assert.throws(() => transition(r, two.id), /Invalid/);
  two.phase = 'ready'; transition(r, two.id);
  assert.equal(r.active, two.id); assert.equal(r.previous, one.id);
  assert.equal(one.phase, 'retained');
});
test('rollback only selects previous retained release and preserves routing for open newer tabs', () => {
  const r = registry(), [one, two] = r.releases;
  transition(r, two.id);
  assert.throws(() => transition(r, two.id, true), /Invalid/);
  const map = routing(r, one.id);
  assert.equal(route(map, '||||/'), one.webPort);
  assert.equal(route(map, `${two.id}|||save|/academy`), two.webPort);
  transition(r, one.id, true);
  assert.equal(r.active, one.id); assert.equal(r.previous, two.id);
});
test('allocated ports are not reused for failed or retired releases', () => {
  const records = [record(1, 'active'), record(2, 'failed'), record(3, 'retired')];
  assert.equal(nextPort(records), records[2].webPort + 1);
  assert.throws(() => nextPort([{ webPort: 3999 }]), /exhausted/);
});
test('migration token is bound to exact source hashes and target commit', () => {
  const a = record(1), b = record(2), plan = [{ name: '2026_11_12_add_field', sha256: 'a'.repeat(64) }];
  assert.deepEqual(checkPlan(plan), plan);
  assert.notEqual(planHash(a, plan), planHash(b, plan));
  assert.notEqual(planHash(a, plan), planHash(a, [{ ...plan[0], sha256: 'b'.repeat(64) }]));
  assert.throws(() => checkPlan([plan[0], plan[0]]), /Invalid/);
  assert.throws(() => checkPlan([{ name: '../unsafe', sha256: 'a'.repeat(64) }]), /Invalid/);
});
test('retirement protects active, previous, young releases and removes only eligible routing', () => {
  const r = registry(), [one, two] = r.releases;
  transition(r, two.id);
  const old = record(3, 'retained'); r.releases.push(old);
  const now = Date.parse('2026-11-12T12:00:00Z');
  assert.throws(() => retireAllowed(r, one.id, now), /eligible/);
  assert.throws(() => retireAllowed(r, two.id, now), /eligible/);
  old.createdAt = '2026-11-12T11:00:00Z';
  assert.throws(() => retireAllowed(r, old.id, now), /eligible/);
  old.createdAt = '2026-11-01T00:00:00Z';
  old.retainedAt = '2026-11-12T11:00:00Z';
  assert.throws(() => retireAllowed(r, old.id, now), /eligible/);
  old.retainedAt = '2026-11-01T00:00:00Z';
  assert.equal(retireAllowed(r, old.id, now), old);
  assert.doesNotMatch(routing(r, r.active, old.id), new RegExp(old.id));
});
test('metadata rejects path traversal, process-name injection and mismatched ports', () => {
  const a = record(1);
  assert.equal(checkRecord(a), a);
  for (const changes of [{ id: '../unsafe' }, { path: '/var/www/siperp' }, { name: 'siperp-web' }, { name: '' },
    { webPort: '3102' }, { apiPort: 8000 }, { phase: 'unexpected' }]) assert.throws(() => checkRecord({ ...a, ...changes }), /Invalid/);
});

test('automatic cleanup frees a fresh obsolete test release but always protects active and rollback', () => {
  const r = registry(), [one, two] = r.releases;
  transition(r, two.id);
  const old = record(3, 'retained'); old.retainedAt = new Date().toISOString();
  const unused = record(4, 'ready');
  const pending = record(5, 'awaiting-migration');
  r.releases.push(old, unused, pending);
  assert.deepEqual(cleanupCandidates(r), [old.id, unused.id]);
  assert.throws(() => retireAllowed(r, old.id), /eligible/);
  assert.equal(retireAllowed(r, old.id, Date.now(), true), old);
  assert.equal(retireAllowed(r, unused.id, Date.now(), true), unused);
  assert.throws(() => retireAllowed(r, one.id, Date.now(), true), /eligible/);
  assert.throws(() => retireAllowed(r, two.id, Date.now(), true), /eligible/);
  assert.throws(() => retireAllowed(r, pending.id, Date.now(), true), /eligible/);
});

test('after activation cleanup keeps exactly the new active and the prior active as rollback', () => {
  const r = registry(), [one, two] = r.releases;
  transition(r, two.id);
  const next = record(3, 'ready'); next.preparedFrom = two.id; r.releases.push(next);
  transition(r, next.id);
  assert.deepEqual(cleanupCandidates(r), [one.id]);
  retireAllowed(r, one.id, Date.now(), true).phase = 'retired';
  assert.deepEqual(cleanupCandidates(r), []);
  transition(r, two.id, true);
  assert.equal(r.active, two.id);
  assert.equal(r.previous, next.id);
});
