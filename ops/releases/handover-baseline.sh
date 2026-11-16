#!/usr/bin/env bash
# First baseline handover only. Keeps both web processes and both API roots.
set -Eeuo pipefail
umask 0027
ACTION=${1:?Use activate or rollback.}
ID=${2:?Pass the prepared baseline ID.}
[[ $EUID == 0 && $ID =~ ^[0-9]{14}-[a-f0-9]{12}$ ]] || exit 1
[[ $ACTION == activate || $ACTION == rollback ]] || exit 1
BASE=/var/www/siperp-deploy
LEGACY=/var/www/siperp
RELEASE="$BASE/releases/$ID"
STATE="$BASE/handover/$ID"
WEB=/etc/nginx/sites-available/siperp-web
ROUTING=/etc/nginx/conf.d/siperp-release-routing.conf
CRON=/etc/cron.d/siperp-scheduler
DROPIN=/etc/systemd/system/siperp-worker.service.d/90-siperp-release.conf
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ $HERE == /usr/local/lib/siperp-release ]] || { echo 'Install tooling in /usr/local/lib/siperp-release.' >&2; exit 1; }
exec 9>/run/lock/siperp-release.lock
flock -n 9 || { echo 'Another release operation is running.' >&2; exit 1; }
as_app() { sudo -H -u siperp -- "$@"; }
atomic_file() {
  # Destination paths below are fixed system config files, never user input.
  install -o root -g root -m 0644 "$1" "$2.siperp-next" || return 1
  mv -Tf "$2.siperp-next" "$2"
}
point_current() {
  [[ ! -e $BASE/current || -L $BASE/current ]] || return 1
  ln -s "$1" "$BASE/.current-$$" || return 1
  mv -Tf "$BASE/.current-$$" "$BASE/current"
}
lock_scheduler() {
  if [[ ! -e $BASE/shared/scheduler.lock ]]; then
    as_app touch "$BASE/shared/scheduler.lock"
  fi
  chown siperp:www-data "$BASE/shared/scheduler.lock"
  chmod 0660 "$BASE/shared/scheduler.lock"
  exec 8>>"$BASE/shared/scheduler.lock"
  echo '=== Waiting for scheduler lock (maximum 360 seconds) ==='
  flock -w 360 8
}
check_live() {
  node "$HERE/runtime.cjs" wait-health http://127.0.0.1:3000/api/health
  node "$HERE/runtime.cjs" wait-health http://127.0.0.1:3101/api/health
  node "$HERE/runtime.cjs" wait-health http://127.0.0.1:8101/api/v1/health
}
public_health() {
  curl --fail --silent --show-error --retry 5 --retry-delay 2 --max-time 15 \
    https://erp.lazsip.or.id/api/health | node "$HERE/runtime.cjs" health
}
restore_legacy() {
  # Scheduler lock is held throughout. Never run a second worker if stop fails.
  echo '=== Returning default traffic and background services to legacy ==='
  if [[ -f $DROPIN ]]; then
    systemctl stop siperp-worker || return 1
    [[ $(systemctl show -p MainPID --value siperp-worker) == 0 ]] || return 1
    unlink "$DROPIN" || return 1
    systemctl daemon-reload || return 1
  fi
  point_current "$LEGACY" || return 1
  systemctl start siperp-worker || return 1
  node "$HERE/runtime.cjs" render-handover "$STATE/web.original" "$ID" "$STATE" 3000 || return 1
  atomic_file "$STATE/routing.next" "$ROUTING" || return 1
  atomic_file "$STATE/web.next" "$WEB" || return 1
  nginx -t || return 1
  systemctl reload nginx || return 1
  atomic_file "$STATE/cron.original" "$CRON" || return 1
  public_health || return 1
  systemctl is-active --quiet siperp-worker || return 1
  as_app pm2 save || return 1
  printf 'legacy\n' > "$STATE/status"
  echo 'ROLLBACK_READY: new page loads use legacy; existing candidate tabs remain version-routed until reload.'
}

if [[ $ACTION == rollback ]]; then
  [[ -f $STATE/web.original && -f $STATE/cron.original && -f $STATE/status ]] || { echo 'No handover backup.' >&2; exit 1; }
  [[ $(cat "$STATE/status") == candidate ]] || { echo 'Baseline is not marked active; inspect before rollback.' >&2; exit 1; }
  node "$HERE/runtime.cjs" wait-health http://127.0.0.1:3000/api/health
  lock_scheduler
  trap 'RESULT=$?; if (( RESULT != 0 )); then printf "attention-required\n" > "$STATE/status"; echo "Rollback incomplete; keep both web processes and inspect the error." >&2; fi' EXIT
  restore_legacy
  exit 0
fi

[[ -f $BASE/baseline-ready && $(cat "$BASE/baseline-ready") == "$ID" ]] || exit 1
[[ ! -e $STATE && ! -e $ROUTING && ! -e $DROPIN && ! -e $BASE/current && ! -L $BASE/current ]] || {
  echo 'Handover state/config already exists. Stop; do not overwrite backups.' >&2; exit 1;
}
[[ -x $HERE/run-scheduler.sh && -f $HERE/queue-settings.php && -f $WEB && ! -L $WEB && -f $CRON && ! -L $CRON ]] || { echo 'Missing tooling or scheduler execute permission.' >&2; exit 1; }
for tool in mysqldump gzip nginx php8.4 node curl flock systemctl; do command -v "$tool" >/dev/null; done
[[ $(as_app git -C "$LEGACY" rev-parse HEAD) == "${ID:15}"* ]] || { echo 'Live commit changed.' >&2; exit 1; }
[[ -z $(as_app git -C "$LEGACY" status --porcelain) ]] || exit 1
[[ $(systemctl show -p User --value siperp-worker) == siperp &&
   $(systemctl show -p Group --value siperp-worker) == www-data ]] || exit 1
systemctl is-active --quiet siperp-worker
as_app node "$HERE/runtime.cjs" repair-config "$RELEASE" "$ID"
# The first rollout supports the audited legacy build without a deployment ID.
as_app node -e 'const fs=require("node:fs");const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).config;if(c.deploymentId)process.exit(1)' "$LEGACY/.next/required-server-files.json"
node -e 'const fs=require("node:fs");const lines=fs.readFileSync(process.argv[1],"utf8").split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith("#"));const expected="* * * * * siperp cd /var/www/siperp/api && /usr/bin/php8.4 artisan schedule:run >> /var/www/siperp/api/storage/logs/scheduler.log 2>&1";if(lines.length!==1||lines[0].trim().replace(/\s+/g," ")!==expected)process.exit(1)' "$CRON"
check_live
curl --fail --silent --show-error --max-time 30 http://127.0.0.1:3101/ |
  node -e 'let b="";process.stdin.on("data",x=>b+=x);process.stdin.on("end",()=>{if(!b.includes(process.argv[1]))process.exitCode=1})' "$ID"
SETTINGS=$(as_app /usr/bin/php8.4 "$HERE/queue-settings.php" "$RELEASE")
read -r WORKER_TIMEOUT STOP_TIMEOUT <<< "$SETTINGS"
[[ $WORKER_TIMEOUT =~ ^[0-9]+$ && $STOP_TIMEOUT =~ ^[0-9]+$ ]] || exit 1
nginx -t
install -d -m 0700 "$BASE/handover" "$STATE"
cp -a "$WEB" "$STATE/web.original"
cp -a "$CRON" "$STATE/cron.original"
install -o root -g root -m 0600 "$LEGACY/api/.env" "$STATE/laravel.env"
systemctl cat siperp-worker > "$STATE/worker.original.txt"
printf '%s\n' "$ID" > "$STATE/release.txt"
echo '=== Database backup; no migration is performed ==='
mysqldump --single-transaction --quick --no-tablespaces --routines --triggers siperp |
  gzip > "$STATE/database.sql.gz"
chmod 0600 "$STATE/database.sql.gz"
gzip -t "$STATE/database.sql.gz"
node "$HERE/runtime.cjs" render-handover "$STATE/web.original" "$ID" "$STATE" 3101
printf '* * * * * siperp /usr/local/lib/siperp-release/run-scheduler.sh >> /var/www/siperp/api/storage/logs/scheduler.log 2>&1\n' > "$STATE/cron.next"

lock_scheduler
CHANGED=0
on_exit() {
  local result=$?
  trap - EXIT
  if (( result != 0 && CHANGED )); then
    echo 'Handover failed; attempting controlled rollback.' >&2
    if ! restore_legacy; then
      printf 'attention-required\n' > "$STATE/status"
      echo "ROLLBACK INCOMPLETE. Keep both web processes; inspect $STATE. Do not repeat deployment." >&2
    fi
  fi
  exit "$result"
}
trap on_exit EXIT
CHANGED=1
point_current "$LEGACY"
atomic_file "$STATE/cron.next" "$CRON"
# Cron re-reads files at minute boundaries. Hold the shared lock until it has
# crossed one boundary; any last unwrapped invocation must drain before switching.
echo '=== Waiting for cron to load the locked scheduler (up to 63 seconds) ==='
BOUNDARY=$(( $(date +%s) / 60 * 60 + 63 ))
while (( $(date +%s) < BOUNDARY )); do sleep 1; done
DRAINED=0
for attempt in $(seq 1 360); do
  if node "$HERE/runtime.cjs" scheduler-running "$LEGACY/api"; then DRAINED=1; break;
  else CODE=$?; [[ $CODE == 10 ]] || exit "$CODE"; fi
  sleep 1
done
(( DRAINED )) || { echo 'Old scheduler has not drained. Stop.' >&2; exit 1; }

install -d -m 0755 /etc/systemd/system/siperp-worker.service.d
cat > "$STATE/worker.next" <<EOF
[Service]
WorkingDirectory=$RELEASE/api
ExecStart=
ExecStart=/usr/bin/php8.4 $RELEASE/api/artisan queue:work payment --queue=callbacks,receipts --sleep=3 --tries=3 --timeout=$WORKER_TIMEOUT
TimeoutStopSec=$STOP_TIMEOUT
KillMode=mixed
SendSIGKILL=no
EOF
atomic_file "$STATE/worker.next" "$DROPIN"
systemctl daemon-reload
echo '=== Finishing the current queue job before replacing the worker ==='
systemctl stop siperp-worker
[[ $(systemctl show -p MainPID --value siperp-worker) == 0 ]] || { echo 'Old worker has not exited; refusing to start a second worker.' >&2; exit 1; }
point_current "$RELEASE"
systemctl start siperp-worker
systemctl is-active --quiet siperp-worker
atomic_file "$STATE/routing.next" "$ROUTING"
atomic_file "$STATE/web.next" "$WEB"
nginx -t
systemctl reload nginx
public_health
curl --fail --silent --show-error --retry 5 --retry-delay 2 --max-time 30 https://erp.lazsip.or.id/ |
  node -e 'let b="";process.stdin.on("data",x=>b+=x);process.stdin.on("end",()=>{if(!b.includes(process.argv[1]))process.exitCode=1})' "$ID"
as_app pm2 save
printf 'candidate\n' > "$STATE/status"
flock -u 8
CHANGED=0
echo "HANDOVER_READY: $ID"
echo "Rollback: bash $HERE/handover-baseline.sh rollback $ID"
echo 'Both web processes are retained. No migration, FPM restart or maintenance mode was used.'
