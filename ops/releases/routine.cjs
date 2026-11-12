#!/usr/bin/env node
// Root-only deployment metadata; no environment values are printed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BASE = '/var/www/siperp-deploy';
const REGISTRY = `${BASE}/registry.json`;
const ID_PATTERN = /^\d{14}-[a-f0-9]{12}$/;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function checkRecord(record) {
  const names = [`siperp-release-${record.id}`];
  if (record.id === '20261112115845-f18799e58267') names.push(`siperp-candidate-${record.id}`);
  if (!ID_PATTERN.test(record.id) || !/^[a-f0-9]{40}$/.test(record.commit) ||
    record.id.slice(15) !== record.commit.slice(0, 12) ||
    record.path !== `${BASE}/releases/${record.id}` ||
    !Number.isInteger(record.webPort) || record.webPort < 3101 || record.webPort > 3999 ||
    record.apiPort !== record.webPort + 5000 ||
    !names.includes(record.name) || !Number.isFinite(Date.parse(record.createdAt)) ||
    !['preparing', 'installed', 'awaiting-migration', 'building', 'ready', 'failed', 'active', 'retained', 'retired'].includes(record.phase)) {
    throw new Error('Invalid release metadata.');
  }
  return record;
}
function readRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (registry.version !== 1 || !Array.isArray(registry.releases)) throw new Error('Unsupported registry.');
  registry.releases.forEach(checkRecord);
  if (new Set(registry.releases.map(r => r.id)).size !== registry.releases.length ||
    new Set(registry.releases.map(r => r.webPort)).size !== registry.releases.length ||
    registry.releases.filter(r => r.phase === 'active').length !== 1 ||
    !registry.releases.some(r => r.id === registry.active && r.phase === 'active') ||
    (registry.previous && !registry.releases.some(r => r.id === registry.previous && r.phase === 'retained'))) throw new Error('Registry is inconsistent.');
  return registry;
}
function save(registry) {
  const temporary = `${REGISTRY}.next`;
  fs.writeFileSync(temporary, JSON.stringify(registry, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, REGISTRY);
}
function get(registry, id) {
  const record = registry.releases.find(r => r.id === id);
  if (!record) throw new Error('Unknown release.');
  return checkRecord(record);
}
function routing(registry, targetId = registry.active, retiring = '') {
  const target = get(registry, targetId);
  const records = registry.releases.filter(r => r.id !== retiring &&
    (r.id === targetId || ['active', 'retained'].includes(r.phase)));
  return `map "$http_x_deployment_id|$arg_dpl|$http_rsc|$http_next_action|$uri" $siperp_release_target {\n` +
    `    default http://127.0.0.1:${target.webPort};\n` + records.map(r =>
      `    "~^${r.id}[|]" http://127.0.0.1:${r.webPort};\n` +
      `    "~^[^|]*[|]${r.id}[|]" http://127.0.0.1:${r.webPort};\n`).join('') +
    '    "~^[|][|]1[|]" http://127.0.0.1:3000;\n' +
    '    "~^[|][|][^|]*[|][^|]+[|]" http://127.0.0.1:3000;\n' +
    '    "~^[|][|][^|]*[|][^|]*[|]/_next/static/" http://127.0.0.1:3000;\n}\n';
}
function nextPort(records) {
  // Never reuse a port, including failed/retired releases: stale version URLs
  // must never reach a different release that happens to take the same port.
  const port = Math.max(3101, ...records.map(r => r.webPort)) + 1;
  if (port > 3999) throw new Error('Port range exhausted; review configuration.');
  return port;
}
function transition(registry, targetId, rollback = false) {
  const old = get(registry, registry.active), target = get(registry, targetId);
  if (target.id === old.id || (rollback ? registry.previous !== target.id || target.phase !== 'retained'
    : target.phase !== 'ready' || target.preparedFrom !== old.id)) throw new Error('Invalid release transition.');
  old.phase = 'retained'; old.retainedAt = new Date().toISOString();
  target.phase = 'active'; target.activatedAt = new Date().toISOString();
  registry.previous = old.id; registry.active = target.id;
  return registry;
}
function fingerprint(source) {
  const files = ['/var/www/siperp/api/.env', `${BASE}/shared/server-actions.key`, path.join(source, 'ecosystem.release.json'),
    ...['.env', '.env.local', '.env.production', '.env.production.local'].map(name => path.join(source, name))];
  return hash(JSON.stringify(files.map(file => [path.basename(file), fs.existsSync(file) ? hash(fs.readFileSync(file)) : null])));
}
function planHash(record, plan) { return hash(JSON.stringify({ commit: record.commit, plan })); }
function checkPlan(plan) {
  if (!Array.isArray(plan) || plan.some(p => !/^[A-Za-z0-9_]+$/.test(p.name) || !/^[a-f0-9]{64}$/.test(p.sha256)) || new Set(plan.map(p => p.name)).size !== plan.length) {
    throw new Error('Invalid migration plan.');
  }
  return plan;
}
function retireAllowed(registry, id, now = Date.now()) {
  const record = get(registry, id);
  if (id === registry.active || id === registry.previous || record.phase !== 'retained' ||
    now - Date.parse(record.retainedAt ?? record.createdAt) < 24 * 60 * 60 * 1000) throw new Error('Release is not eligible for retirement.');
  return record;
}
function cli() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'init') {
    if (fs.existsSync(REGISTRY)) throw new Error('Registry already exists.');
    const [id, commit] = args;
    const record = checkRecord({ id, commit, path: `${BASE}/releases/${id}`, webPort: 3101, apiPort: 8101,
      name: `siperp-candidate-${id}`, phase: 'active', apiEnvHash: hash(fs.readFileSync('/var/www/siperp/api/.env')), createdAt: new Date().toISOString() });
    const map = fs.readFileSync('/etc/nginx/conf.d/siperp-release-routing.conf', 'utf8');
    const registry = { version: 1, active: id, previous: null, releases: [record], routingHash: hash(map) };
    if (routing(registry).trim() !== map.trim()) throw new Error('Baseline routing differs from audited setup.');
    save(registry); return;
  }
  const registry = readRegistry();
  if (command === 'status') {
    console.log(`Active: ${registry.active}\nPrevious: ${registry.previous ?? '-'}\n`);
    for (const r of registry.releases) console.log(`${r.id} | ${r.phase} | web ${r.webPort} | API ${r.apiPort}`);
  } else if (command === 'schema-bases') {
    console.log([...new Set(registry.releases.filter(r => r.schemaApplied || ['active', 'retained', 'retired'].includes(r.phase)).map(r => r.commit))].join('\n'));
  } else if (command === 'active' || command === 'previous') {
    const id = registry[command]; if (!id) throw new Error('No previous release.'); console.log(id);
  } else if (command === 'record') {
    const record = get(registry, args[0]);
    // Tab-separated, validated metadata only. No shell eval/source is needed.
    console.log([record.path, record.webPort, record.apiPort, record.name, record.commit, record.phase].join('\t'));
  } else if (command === 'verify') {
    const current = get(registry, registry.active);
    if (fs.realpathSync(`${BASE}/current`) !== current.path ||
      hash(fs.readFileSync('/etc/nginx/conf.d/siperp-release-routing.conf')) !== registry.routingHash) throw new Error('Deployment state drifted.');
  } else if (command === 'reserve') {
    if (registry.releases.filter(r => ['ready', 'active', 'retained'].includes(r.phase)).length >= 3) {
      throw new Error('Three releases retained; retire an eligible old release before building another.');
    }
    const [id, commit] = args;
    if (registry.releases.some(r => r.id === id)) throw new Error('Release ID already exists.');
    const port = nextPort(registry.releases);
    const record = checkRecord({ id, commit, path: `${BASE}/releases/${id}`, webPort: port, apiPort: port + 5000,
      name: `siperp-release-${id}`, phase: 'preparing', preparedFrom: registry.active,
      apiEnvHash: hash(fs.readFileSync('/var/www/siperp/api/.env')),
      inputHash: fingerprint(get(registry, registry.active).path), createdAt: new Date().toISOString() });
    registry.releases.push(record); save(registry);
  } else if (command === 'phase') {
    if (!['installed', 'awaiting-migration', 'building', 'ready', 'failed'].includes(args[1])) throw new Error('Invalid phase.');
    const record = get(registry, args[0]);
    if (['active', 'retained', 'retired'].includes(record.phase)) throw new Error('Cannot change a serving release phase.');
    record.phase = args[1]; save(registry);
  } else if (command === 'inputs') {
    const record = get(registry, args[0]);
    if (record.preparedFrom !== registry.active || record.inputHash !== fingerprint(get(registry, registry.active).path)) {
      throw new Error('Active release or environment changed; prepare again.');
    }
  } else if (command === 'config') {
    const record = get(registry, args[0]), current = get(registry, registry.active);
    const previous = JSON.parse(fs.readFileSync(path.join(current.path, 'ecosystem.release.json'), 'utf8')).apps[0];
    const env = { NODE_ENV: 'production' };
    for (const [key, value] of Object.entries(previous.env)) if (/^NEXT_PUBLIC_[A-Z0-9_]+$/.test(key) && typeof value === 'string') env[key] = value;
    env.LARAVEL_API_URL = `http://127.0.0.1:${record.apiPort}/api/v1`;
    env.NEXT_DEPLOYMENT_ID = record.id;
    env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = fs.readFileSync(`${BASE}/shared/server-actions.key`, 'utf8').trim();
    if (![16, 24, 32].includes(Buffer.from(env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY, 'base64').length)) throw new Error('Invalid shared action key.');
    const config = { apps: [{ name: record.name, cwd: record.path, script: `${record.path}/node_modules/next/dist/bin/next`,
      args: `start --hostname 127.0.0.1 --port ${record.webPort}`, interpreter: '/usr/bin/node',
      exec_mode: 'fork', instances: 1, watch: false, autorestart: true, kill_timeout: 300000, env }] };
    const file = `${record.path}/ecosystem.release.json`;
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { mode: 0o640, flag: 'wx' });
  } else if (command === 'api-config') {
    const r = get(registry, args[0]);
    console.log(`server {
    listen 127.0.0.1:${r.apiPort};
    server_name localhost;
    root ${r.path}/api/public;
    index index.php;
    client_max_body_size 60m;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location = /index.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_read_timeout 300s;
    }
    location ~ \\.php$ { return 404; }
    location ~ /\\. { deny all; }
}`);
  } else if (command === 'plan') {
    const record = get(registry, args[0]);
    const plan = checkPlan(JSON.parse(fs.readFileSync(args[1], 'utf8')));
    record.plan = plan; record.planHash = planHash(record, plan); save(registry);
    if (plan.length) {
      console.log(`MIGRATION_REVIEW_REQUIRED: ${record.id}\nReview token: ${record.planHash}`);
      for (const item of plan) console.log(`${item.name} ${item.sha256}`);
    } else console.log('No pending migrations.');
  } else if (command === 'check-plan') {
    const record = get(registry, args[0]);
    const plan = checkPlan(JSON.parse(fs.readFileSync(args[1], 'utf8')));
    if (record.phase !== 'awaiting-migration' || record.planHash !== args[2] || planHash(record, plan) !== args[2]) {
      throw new Error('Migration review token no longer matches.');
    }
  } else if (command === 'migrated') {
    get(registry, args[0]).schemaApplied = true; save(registry);
  } else if (command === 'count-plan') {
    console.log(get(registry, args[0]).plan?.length ?? 0);
  } else if (command === 'check-switch') {
    if (get(registry, args[0]).apiEnvHash !== hash(fs.readFileSync('/var/www/siperp/api/.env'))) {
      throw new Error('Environment changed since this release was cached; prepare/review config before switching.');
    }
    transition(structuredClone(registry), args[0], args[1] === 'rollback');
  } else if (command === 'routing') {
    process.stdout.write(routing(registry, args[0] || registry.active, args[1] || ''));
  } else if (command === 'switched') {
    transition(registry, args[0], args[1] === 'rollback');
    registry.routingHash = hash(fs.readFileSync('/etc/nginx/conf.d/siperp-release-routing.conf'));
    save(registry);
  } else if (command === 'retire-check') {
    retireAllowed(registry, args[0]);
  } else if (command === 'retired') {
    retireAllowed(registry, args[0]).phase = 'retired';
    registry.routingHash = hash(fs.readFileSync('/etc/nginx/conf.d/siperp-release-routing.conf'));
    save(registry);
  } else {
    throw new Error('Unknown routine operation.');
  }
}
module.exports = { checkRecord, routing, nextPort, transition, planHash, checkPlan, retireAllowed };
if (require.main === module) {
  try { cli(); } catch (error) {
    // Errors are operator messages generated above; do not leak fs/config dumps.
    console.error(error.code || error.constructor !== Error ? 'Release metadata/file operation failed; no secrets displayed.' : error.message);
    process.exitCode = 1;
  }
}
