#!/usr/bin/env node
// Never print the PM2 environment or the generated encryption key.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function healthy(text) {
  try {
    const data = JSON.parse(text).data;
    return data?.status === 'ok' && data?.database?.status === 'connected';
  } catch { return false; }
}

async function waitForHealth(url, { attempts = 30, interval = 1000, fetcher = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(3000), redirect: 'error' });
      if (response.ok && healthy(await response.text())) return;
    } catch { /* Reload and process startup can temporarily refuse connections. */ }
    if (attempt + 1 < attempts) await sleep(interval);
  }
  throw new Error('Readiness deadline exceeded.');
}

function snapshot(processes, release, legacy, shared, id) {
  const current = processes.filter(p => p.name === 'siperp-web');
  if (current.length !== 1 || current[0].pm2_env?.status !== 'online') {
    throw new Error('Expected exactly one online siperp-web process.');
  }
  const source = current[0].pm2_env;
  const env = { NODE_ENV: 'production' };
  for (const [name, value] of Object.entries(source)) {
    if (/^NEXT_PUBLIC_[A-Z0-9_]+$/.test(name) && typeof value === 'string') env[name] = value;
  }
  const keyPath = path.join(shared, 'server-actions.key');
  if (!fs.existsSync(keyPath)) {
    let key = source.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;
    if (!key) {
      const manifest = path.join(legacy, '.next/server/server-reference-manifest.json');
      if (fs.existsSync(manifest)) key = JSON.parse(fs.readFileSync(manifest, 'utf8')).encryptionKey;
    }
    if (typeof key !== 'string' || ![16, 24, 32].includes(Buffer.from(key, 'base64').length)) {
      key = crypto.randomBytes(32).toString('base64');
    }
    fs.writeFileSync(keyPath, key, { mode: 0o600, flag: 'wx' });
  }
  env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = fs.readFileSync(keyPath, 'utf8').trim();
  env.NEXT_DEPLOYMENT_ID = id;
  env.LARAVEL_API_URL = 'http://127.0.0.1:8101/api/v1';
  const config = { apps: [{
    name: `siperp-candidate-${id}`, cwd: release,
    script: path.join(release, 'node_modules/next/dist/bin/next'),
    args: 'start --hostname 127.0.0.1 --port 3101',
    interpreter: '/usr/bin/node', exec_mode: 'fork', instances: 1,
    watch: false, autorestart: true, kill_timeout: 300000, env,
  }] };
  fs.writeFileSync(path.join(release, 'ecosystem.release.json'),
    `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

function repairConfig(release, id) {
  const target = path.join(release, 'ecosystem.release.json');
  const config = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8'))
    : require(path.join(release, 'ecosystem.release.cjs'));
  const app = config.apps?.[0];
  if (config.apps?.length !== 1 || app.name !== `siperp-candidate-${id}` || app.cwd !== release ||
    app.script !== path.join(release, 'node_modules/next/dist/bin/next') ||
    app.args !== 'start --hostname 127.0.0.1 --port 3101' ||
    app.env?.LARAVEL_API_URL !== 'http://127.0.0.1:8101/api/v1' ||
    app.env?.NEXT_DEPLOYMENT_ID !== id) throw new Error('Candidate config mismatch.');
  if (!fs.existsSync(target)) fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

function misstartedProcessId(processes, release) {
  const matches = processes.filter(p => p.name === 'ecosystem.release' &&
    p.pm2_env?.pm_exec_path === path.join(release, 'ecosystem.release.cjs'));
  if (matches.length > 1 || (matches.length && !Number.isSafeInteger(matches[0].pm_id))) {
    throw new Error('Ambiguous stray process.');
  }
  return matches.length ? String(matches[0].pm_id) : '';
}

function handoverConfig(site, id, activePort = 3101) {
  if (!/^\d{14}-[a-f0-9]{12}$/.test(id) || ![3000, 3101].includes(activePort)) throw new Error('Invalid handover.');
  const matches = site.match(/proxy_pass\s+http:\/\/127\.0\.0\.1:3000\s*;/g) ?? [];
  if (matches.length !== 1) throw new Error('Public upstream differs from audited configuration.');
  const web = site.replace(matches[0], 'proxy_pass $siperp_release_target;')
    .replace(/proxy_read_timeout\s+120s\s*;/g, 'proxy_read_timeout 300s;');
  // Legacy tabs have no deployment ID. New Next navigation/actions send it;
  // new assets use ?dpl=. Keep both processes so old tabs retain their own build.
  const routing = `map "$http_x_deployment_id|$arg_dpl|$http_rsc|$http_next_action|$uri" $siperp_release_target {
    default http://127.0.0.1:${activePort};
    "~^${id}[|]" http://127.0.0.1:3101;
    "~^[^|]*[|]${id}[|]" http://127.0.0.1:3101;
    "~^[|][|]1[|]" http://127.0.0.1:3000;
    "~^[|][|][^|]*[|][^|]+[|]" http://127.0.0.1:3000;
    "~^[|][|][^|]*[|][^|]*[|]/_next/static/" http://127.0.0.1:3000;
}
`;
  return { web, routing };
}

function schedulerRunning(legacy, procRoot = '/proc', io = fs) {
  for (const pid of io.readdirSync(procRoot).filter(name => /^\d+$/.test(name))) {
    try {
      const dir = path.join(procRoot, pid);
      const args = io.readFileSync(path.join(dir, 'cmdline'), 'utf8').split('\0');
      if (/^php(?:[0-9.]+)?$/.test(path.basename(args[0])) && args.includes('schedule:run') &&
        args.some(arg => path.basename(arg) === 'artisan') && io.realpathSync(path.join(dir, 'cwd')) === legacy) return true;
    } catch (error) {
      if (!['ENOENT', 'ESRCH', 'EINVAL'].includes(error.code)) throw error;
    }
  }
  return false;
}

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  if (operation === 'health') {
    process.exitCode = healthy(fs.readFileSync(0, 'utf8')) ? 0 : 1;
  } else if (operation === 'wait-health') {
    await waitForHealth(args[0]);
    console.log('HEALTH_READY');
  } else if (operation === 'snapshot') {
    snapshot(JSON.parse(fs.readFileSync(0, 'utf8')), ...args);
  } else if (operation === 'repair-config') {
    repairConfig(...args);
  } else if (operation === 'misstarted-process-id') {
    const id = misstartedProcessId(JSON.parse(fs.readFileSync(0, 'utf8')), args[0]);
    if (id) console.log(id);
  } else if (operation === 'render-handover') {
    const [siteFile, id, outputDir, port] = args;
    const result = handoverConfig(fs.readFileSync(siteFile, 'utf8'), id, Number(port || 3101));
    fs.writeFileSync(path.join(outputDir, 'web.next'), result.web, { mode: 0o600 });
    fs.writeFileSync(path.join(outputDir, 'routing.next'), result.routing, { mode: 0o600 });
  } else if (operation === 'scheduler-running') {
    process.exitCode = schedulerRunning(args[0]) ? 10 : 0;
  } else if (operation === 'build') {
    const release = args[0];
    const config = JSON.parse(fs.readFileSync(path.join(release, 'ecosystem.release.json'), 'utf8'));
    const result = spawnSync('/usr/bin/nice', ['-n', '10', 'npm', 'run', 'build'], {
      cwd: release, stdio: 'inherit', env: { ...process.env, ...config.apps[0].env,
        NODE_OPTIONS: '--max-old-space-size=1536' },
    });
    process.exitCode = result.status ?? 1;
  } else {
    throw new Error('Unknown release runtime operation.');
  }
}

module.exports = { healthy, snapshot, waitForHealth, repairConfig, misstartedProcessId, handoverConfig, schedulerRunning };
if (require.main === module) {
  main().catch(() => { console.error('Release runtime failed; no credentials displayed.'); process.exitCode = 1; });
}
