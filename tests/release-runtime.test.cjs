const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { healthy, snapshot, waitForHealth, repairConfig, misstartedProcessId, handoverConfig, schedulerRunning } = require('../ops/releases/runtime.cjs');

test('handover preserves TLS and headers and only replaces the audited upstream', () => {
  const site = 'server {\nserver_name erp.lazsip.or.id;\nlisten 443 ssl;\nssl_certificate /private/cert.pem;\nlocation / {\nproxy_pass http://127.0.0.1:3000;\nproxy_set_header Host $host;\nproxy_read_timeout 120s;\n}\n}';
  const id = '20261112115845-f18799e58267';
  const candidate = handoverConfig(site, id);
  assert.match(candidate.web, /ssl_certificate \/private\/cert.pem;/);
  assert.match(candidate.web, /proxy_set_header Host \$host;/);
  assert.match(candidate.web, /proxy_pass \$siperp_release_target;/);
  assert.match(candidate.web, /proxy_read_timeout 300s;/);
  assert.match(candidate.routing, /default http:\/\/127.0.0.1:3101;/);
  assert.match(handoverConfig(site, id, 3000).routing, /default http:\/\/127.0.0.1:3000;/);
  assert.throws(() => handoverConfig(site.replace(':3000', ':4000'), id), /differs/);
  assert.throws(() => handoverConfig(site + site, id), /differs/);
  assert.throws(() => handoverConfig(site, 'unsafe;value'), /Invalid/);
});

test('routing retains version-specific assets, navigation, and actions for legacy and candidate tabs', () => {
  const id = '20261112115845-f18799e58267';
  const { routing } = handoverConfig('proxy_pass http://127.0.0.1:3000;', id);
  const rules = [...routing.matchAll(/"~([^"\n]+)" http:\/\/127\.0\.0\.1:(\d+);/g)]
    .map(([, regex, port]) => [new RegExp(regex), Number(port)]);
  const route = key => rules.find(([regex]) => regex.test(key))?.[1] ?? 3101;
  assert.equal(route('||||/'), 3101);
  assert.equal(route('||||/api/health'), 3101);
  assert.equal(route('||||/_next/static/old.js'), 3000);
  assert.equal(route(`|${id}|||/_next/static/new.js`), 3101);
  assert.equal(route('||1||/academy/materi'), 3000);
  assert.equal(route('|||old-action|/academy'), 3000);
  assert.equal(route(`${id}||1||/academy`), 3101);
  assert.equal(route(`${id}|||new-action|/academy`), 3101);
});

test('scheduler drain distinguishes the legacy scheduler from other apps and refuses unreadable state', () => {
  const legacy = '/legacy/api';
  const io = {
    readdirSync: () => ['self', '123'],
    readFileSync: () => '/usr/bin/php8.4\0artisan\0schedule:run\0',
    realpathSync: () => legacy,
  };
  assert.equal(schedulerRunning(legacy, '/proc', io), true);
  assert.equal(schedulerRunning(legacy, '/proc', { ...io, realpathSync: () => '/another/app/api' }), false);
  assert.equal(schedulerRunning(legacy, '/proc', { ...io, readFileSync: () => '/usr/bin/php8.4\0artisan\0queue:work\0' }), false);
  assert.equal(schedulerRunning(legacy, '/proc', { ...io, readFileSync: () => { throw Object.assign(new Error(), { code: 'ENOENT' }); } }), false);
  assert.throws(() => schedulerRunning(legacy, '/proc', { ...io, readFileSync: () => { throw Object.assign(new Error(), { code: 'EACCES' }); } }));
});

test('readiness survives reload connection refusal and startup errors before accepting database health', async () => {
  let calls = 0;
  await waitForHealth('http://candidate/health', { attempts: 4, sleep: async () => {}, fetcher: async () => {
    calls++;
    if (calls === 1) throw new Error('ECONNREFUSED');
    if (calls === 2) return { ok: false };
    if (calls === 3) return { ok: true, text: async () => '{"data":{"status":"ok"}}' };
    return { ok: true, text: async () => '{"data":{"status":"ok","database":{"status":"connected"}}}' };
  } });
  assert.equal(calls, 4);
});

test('persistent failures exhaust a bounded readiness budget rather than reporting ready', async () => {
  let calls = 0;
  await assert.rejects(waitForHealth('http://candidate/health', {
    attempts: 3, sleep: async () => {}, fetcher: async () => { calls++; throw new Error('ECONNREFUSED'); },
  }), /Readiness deadline/);
  assert.equal(calls, 3);
});

test('readiness requires both application and database; HTML/partial JSON fail closed', () => {
  assert.equal(healthy('{"data":{"status":"ok","database":{"status":"connected"}}}'), true);
  for (const body of ['<html>502</html>', '{}', '{', '{"data":{"status":"ok"}}',
    '{"data":{"status":"ok","database":{"status":"disconnected"}}}']) assert.equal(healthy(body), false);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'siperp-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const release = path.join(root, 'release'), shared = path.join(root, 'shared');
  fs.mkdirSync(release); fs.mkdirSync(shared);
  return { root, release, shared };
}

test('repairs legacy config to PM2 JSON without changing build key or backend', t => {
  const { root, release, shared } = fixture(t);
  snapshot([{ name: 'siperp-web', pm2_env: { status: 'online' } }], release, root, shared, 'baseline');
  const target = path.join(release, 'ecosystem.release.json');
  const before = JSON.parse(fs.readFileSync(target, 'utf8'));
  fs.writeFileSync(path.join(release, 'ecosystem.release.cjs'), `module.exports = ${JSON.stringify(before)};`);
  fs.unlinkSync(target);
  repairConfig(release, 'baseline');
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), before);
  repairConfig(release, 'baseline');
  assert.throws(() => repairConfig(release, 'wrong-release'), /mismatch/);
});

test('cleanup selects only the misstarted candidate path, never the live app or another release', () => {
  const release = path.resolve('/candidate');
  const processes = [
    { name: 'siperp-web', pm_id: 0, pm2_env: { pm_exec_path: path.join(release, 'ecosystem.release.cjs') } },
    { name: 'ecosystem.release', pm_id: 9, pm2_env: { pm_exec_path: '/different-release/ecosystem.release.cjs' } },
  ];
  assert.equal(misstartedProcessId(processes, release), '');
  const stray = { name: 'ecosystem.release', pm_id: 1, pm2_env: { pm_exec_path: path.join(release, 'ecosystem.release.cjs') } };
  assert.equal(misstartedProcessId([...processes, stray], release), '1');
  assert.throws(() => misstartedProcessId([stray, stray], release), /Ambiguous/);
});

test('candidate uses an isolated backend, preserves action key and public runtime settings, excludes secrets', t => {
  const { root, release, shared } = fixture(t);
  const key = Buffer.alloc(32, 7).toString('base64');
  snapshot([{ name: 'siperp-web', pm2_env: { status: 'online',
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: key, NEXT_PUBLIC_SIP_WHATSAPP: 'test-number',
    LARAVEL_API_URL: 'http://127.0.0.1:8000/api/v1', RESEND_API_KEY: 'must-not-copy',
    PAYMENT_API_KEY: 'must-not-copy', LEARNING_PREVIEW: 'true' } }], release, root, shared, 'baseline');
  const text = fs.readFileSync(path.join(release, 'ecosystem.release.json'), 'utf8');
  const app = require(path.join(release, 'ecosystem.release.json')).apps[0];
  assert.equal(app.env.LARAVEL_API_URL, 'http://127.0.0.1:8101/api/v1');
  assert.equal(app.env.NEXT_PUBLIC_SIP_WHATSAPP, 'test-number');
  assert.equal(app.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY, key);
  assert.equal(app.env.NEXT_DEPLOYMENT_ID, 'baseline');
  assert.equal(app.env.LEARNING_PREVIEW, undefined);
  assert.doesNotMatch(text, /must-not-copy/);
});

test('reuses the persisted key on a later preparation instead of rotating it', t => {
  const { root, release, shared } = fixture(t);
  const key = Buffer.alloc(32, 8).toString('base64');
  fs.writeFileSync(path.join(shared, 'server-actions.key'), key);
  snapshot([{ name: 'siperp-web', pm2_env: { status: 'online' } }], release, root, shared, 'baseline');
  const app = require(path.join(release, 'ecosystem.release.json')).apps[0];
  assert.equal(app.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY, key);
});

test('extracts an existing build key without copying the private server manifest', t => {
  const { root, release, shared } = fixture(t);
  const dir = path.join(root, '.next/server'); fs.mkdirSync(dir, { recursive: true });
  const key = Buffer.alloc(32, 9).toString('base64');
  fs.writeFileSync(path.join(dir, 'server-reference-manifest.json'), JSON.stringify({ encryptionKey: key }));
  snapshot([{ name: 'siperp-web', pm2_env: { status: 'online' } }], release, root, shared, 'baseline');
  assert.equal(fs.readFileSync(path.join(shared, 'server-actions.key'), 'utf8'), key);
});

test('missing/ambiguous/offline live processes do not produce a candidate config', t => {
  const { root, release, shared } = fixture(t);
  for (const processes of [[], [{ name: 'siperp-web', pm2_env: { status: 'errored' } }],
    [{ name: 'siperp-web' }, { name: 'siperp-web' }]]) {
    assert.throws(() => snapshot(processes, release, root, shared, 'baseline'));
  }
  assert.equal(fs.existsSync(path.join(release, 'ecosystem.release.json')), false);
});
