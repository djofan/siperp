#!/usr/bin/env bash
# Routine releases after the successful baseline handover. Root only.
set -Eeuo pipefail
umask 0027
ACTION=${1:-status}
BASE=/var/www/siperp-deploy
SOURCE=/var/www/siperp
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
MAP=/etc/nginx/conf.d/siperp-release-routing.conf
WORKER=/etc/systemd/system/siperp-worker.service.d/90-siperp-release.conf
CRON=/etc/cron.d/siperp-scheduler
[[ $EUID == 0 && $HERE == /usr/local/lib/siperp-release ]] || { echo 'Run as root from installed tooling.' >&2; exit 1; }
for tool in node php8.4 nginx sudo git flock curl composer npm mysqldump gzip ss; do command -v "$tool" >/dev/null; done
exec 9>/run/lock/siperp-release.lock
flock -n 9 || { echo 'Another release operation is running.' >&2; exit 1; }
as_app() { sudo -H -u siperp -- "$@"; }
meta() { node "$HERE/routine.cjs" "$@"; }
record() {
  [[ $1 =~ ^[0-9]{14}-[a-f0-9]{12}$ ]] || return 1
  IFS=$'\t' read -r DIR WEB_PORT API_PORT NAME COMMIT PHASE < <(meta record "$1")
  [[ -n $DIR && $DIR == "$BASE/releases/$1" && $WEB_PORT =~ ^[0-9]+$ && $API_PORT =~ ^[0-9]+$ ]] || return 1
  API_FILE="/etc/nginx/conf.d/siperp-api-$1.conf"
  if [[ $WEB_PORT == 3101 ]]; then API_FILE=/etc/nginx/conf.d/siperp-candidate-api.conf; fi
}
atomic_file() {
  install -o root -g root -m 0644 "$1" "$2.siperp-next" || return 1
  mv -Tf "$2.siperp-next" "$2"
}
point_current() {
  [[ -L $BASE/current ]] || return 1
  ln -s "$1" "$BASE/.current-$$" || return 1
  mv -Tf "$BASE/.current-$$" "$BASE/current"
}
app_php() { as_app bash -c 'set -e; cd "$1/api"; shift; exec /usr/bin/php8.4 artisan "$@"' -- "$DIR" "$@"; }
health() { node "$HERE/runtime.cjs" wait-health "http://127.0.0.1:$1/api/health"; }
public_health() {
  curl --fail --silent --show-error --retry 5 --retry-delay 2 --max-time 15 https://erp.lazsip.or.id/api/health |
    node "$HERE/runtime.cjs" health
}
assert_deployment() {
  curl --fail --silent --show-error --max-time 30 "$1" |
    node -e 'let b="";process.stdin.on("data",x=>b+=x);process.stdin.on("end",()=>{if(!b.includes(process.argv[1]))process.exitCode=1})' "$2"
}
verify_services() {
  meta verify
  local active active_dir
  active=$(meta active)
  active_dir="$BASE/releases/$active/api"
  [[ $(systemctl show -p WorkingDirectory --value siperp-worker) == "$active_dir" ]] || { echo 'Worker differs from active release.' >&2; return 1; }
  [[ $(systemctl show -p User --value siperp-worker) == siperp && $(systemctl show -p Group --value siperp-worker) == www-data ]] || return 1
  [[ $(cat "$CRON") == '* * * * * siperp /usr/local/lib/siperp-release/run-scheduler.sh >> /var/www/siperp/api/storage/logs/scheduler.log 2>&1' ]] || { echo 'Scheduler differs from audited wrapper.' >&2; return 1; }
  systemctl is-active --quiet siperp-worker
  systemctl is-active --quiet cron
  nginx -t
}
backup() {
  install -d -m 0700 "$BASE/backups"
  TX=$(mktemp -d "$BASE/backups/$ID-$(date -u +%Y%m%d%H%M%S)-XXXXXX")
  cp -a "$BASE/registry.json" "$TX/registry.original.json"
  cp -a "$MAP" "$TX/routing.original.conf"
  cp -a "$WORKER" "$TX/worker.original.conf"
  cp -a "$CRON" "$TX/scheduler.original"
  cp -a /etc/nginx/sites-available/siperp-web "$TX/web.original"
  install -o root -g root -m 0600 "$SOURCE/api/.env" "$TX/laravel.env"
  mysqldump --single-transaction --quick --no-tablespaces --routines --triggers siperp | gzip > "$TX/database.sql.gz"
  chmod 0600 "$TX/database.sql.gz"
  gzip -t "$TX/database.sql.gz"
  echo "BACKUP_READY: $TX"
}
plan_now() {
  as_app /usr/bin/php8.4 "$HERE/migration-plan.php" "$DIR" > "$BASE/plans/$ID.json"
}
stop_worker() {
  systemctl stop siperp-worker || return 1
  [[ $(systemctl show -p MainPID --value siperp-worker) == 0 ]] || { echo 'Worker has not exited; refusing a duplicate.' >&2; return 1; }
}
restore_switch() {
  stop_worker || return 1
  atomic_file "$TX/worker.original.conf" "$WORKER" || return 1
  systemctl daemon-reload || return 1
  point_current "$OLD_DIR" || return 1
  systemctl start siperp-worker || return 1
  atomic_file "$TX/routing.original.conf" "$MAP" || return 1
  nginx -t || return 1
  systemctl reload nginx || return 1
  install -o root -g root -m 0600 "$TX/registry.original.json" "$BASE/registry.json.next" || return 1
  mv -Tf "$BASE/registry.json.next" "$BASE/registry.json" || return 1
  public_health || return 1
  systemctl is-active --quiet siperp-worker || return 1
}

MODE=none
CREATED_API=0
CREATED_PM2=0
finish() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    if [[ $MODE == prepare ]]; then
      if (( CREATED_PM2 )); then as_app pm2 delete "$NAME" >/dev/null 2>&1 || true; as_app pm2 save >/dev/null 2>&1 || true; fi
      if (( CREATED_API )) && [[ -f $API_FILE ]]; then
        unlink "$API_FILE" || true
        if nginx -t; then systemctl reload nginx || true; fi
      fi
      meta phase "$ID" failed || true
      echo "PREPARE_FAILED: $ID. Active upstream unchanged; release files retained." >&2
    elif [[ $MODE == switch ]]; then
      echo 'Switch failed; returning pointer, worker and Nginx to the previous release.' >&2
      if ! restore_switch; then
        printf '%s\n' "$TX" > "$BASE/attention-required"
        echo "ROLLBACK_INCOMPLETE: inspect $TX; do not repeat deployment." >&2
      else echo 'AUTOMATIC_ROLLBACK_OK. Database was not restored.' >&2; fi
    elif [[ $MODE == migrate || $MODE == retire ]]; then
      printf '%s\n' "$TX" > "$BASE/attention-required"
      echo 'Operation interrupted. Inspect database/services before another deployment.' >&2
    fi
  fi
  exit "$result"
}
trap finish EXIT

if [[ $ACTION == init ]]; then
  [[ ! -e $BASE/registry.json && -L $BASE/current ]] || { echo 'Already initialized or baseline missing.' >&2; exit 1; }
  ID=$(basename "$(readlink -f "$BASE/current")")
  [[ $ID == 20261112115845-f18799e58267 ]] || { echo 'Unexpected baseline; review initialization.' >&2; exit 1; }
  health 3101
  public_health
  COMMIT=$(as_app git -C "$SOURCE" rev-parse HEAD)
  meta init "$ID" "$COMMIT"
  verify_services
  echo 'RELEASE_MANAGER_READY'
  exit 0
fi
[[ -f $BASE/registry.json ]] || { echo 'Run init once after the baseline handover.' >&2; exit 1; }
if [[ $ACTION == status ]]; then
  meta status
  if [[ -f $BASE/attention-required ]]; then echo 'ATTENTION_REQUIRED: inspect the last operation before deploying.'; fi
  exit 0
fi
[[ ! -f $BASE/attention-required ]] || { echo 'ATTENTION_REQUIRED: deployment is blocked pending inspection.' >&2; exit 1; }
verify_services
install -d -m 0700 "$BASE/plans"

build_release() {
  [[ $PHASE == installed ]] || { echo 'Release is not installed/approved for build.' >&2; return 1; }
  meta inputs "$ID"
  plan_now
  meta plan "$ID" "$BASE/plans/$ID.json"
  [[ $(meta count-plan "$ID") == 0 ]] || { meta phase "$ID" awaiting-migration; MODE=none; return 0; }
  (( $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) >= 2097152 )) || { echo 'Need 2 GiB available RAM for build.' >&2; return 1; }
  [[ ! -e $API_FILE && -z $(ss -H -ltn "( sport = :$WEB_PORT or sport = :$API_PORT )") ]] || { echo 'Candidate config/ports already in use.' >&2; return 1; }
  meta phase "$ID" building
  as_app node "$HERE/runtime.cjs" build "$DIR"
  CREATED_API=1
  meta api-config "$ID" > "$API_FILE"
  chmod 0644 "$API_FILE"
  nginx -t
  systemctl reload nginx
  node "$HERE/runtime.cjs" wait-health "http://127.0.0.1:$API_PORT/api/v1/health"
  CREATED_PM2=1
  as_app pm2 start "$DIR/ecosystem.release.json" --only "$NAME"
  health "$WEB_PORT"
  assert_deployment "http://127.0.0.1:$WEB_PORT/" "$ID"
  curl --fail --silent --show-error --max-time 30 "http://127.0.0.1:$WEB_PORT/lazsip" >/dev/null
  public_health
  as_app pm2 save
  meta phase "$ID" ready
  MODE=none
  echo "RELEASE_READY: $ID"
  if [[ $ACTION != update ]]; then echo "Activate: bash $HERE/release.sh activate $ID"; fi
}

prepare_release() {
  REF=${1:-main}
  [[ $REF == main || $REF =~ ^[a-f0-9]{7,40}$ ]] || { echo 'Use main or a merged commit SHA.' >&2; exit 1; }
  [[ -z $(as_app git -C "$SOURCE" status --porcelain) ]] || { echo 'Source checkout has local changes; stop.' >&2; exit 1; }
  as_app git -C "$SOURCE" fetch --prune origin main
  if [[ $REF == main ]]; then REF=origin/main; fi
  SHA=$(as_app git -C "$SOURCE" rev-parse --verify "$REF^{commit}")
  as_app git -C "$SOURCE" merge-base --is-ancestor "$SHA" origin/main
  OLD=$(meta active)
  record "$OLD"
  OLD_DIR=$DIR; OLD_COMMIT=$COMMIT
  if [[ $ACTION == update && $SHA == $OLD_COMMIT ]]; then
    UPDATE_NOOP=1
    echo "ALREADY_UP_TO_DATE: $OLD"
    return 0
  fi
  as_app git -C "$SOURCE" merge-base --is-ancestor "$OLD_COMMIT" "$SHA"
  echo '=== Changes since active release ==='
  as_app git -C "$SOURCE" log --oneline "$OLD_COMMIT..$SHA"
  # A code rollback must not hide edits to an already-applied migration.
  BASES=$(meta schema-bases)
  while IFS= read -r SCHEMA_COMMIT; do
    if ! as_app git -C "$SOURCE" diff --name-status "$SCHEMA_COMMIT" "$SHA" -- api/database/migrations | awk 'NF && $1 != "A" {bad=1} END {exit bad}'; then
      echo 'Previously deployed migration files changed/deleted. Review manually; routine deployment refused.' >&2; exit 1;
    fi
  done <<< "$BASES"
  (( $(df -Pk /var/www | awk 'NR==2 {print $4}') >= 5242880 )) || { echo 'Need 5 GiB disk available.' >&2; exit 1; }
  ID="$(date -u +%Y%m%d%H%M%S)-${SHA:0:12}"
  meta reserve "$ID" "$SHA"
  record "$ID"
  MODE=prepare
  [[ ! -e $DIR ]] || exit 1
  install -d -o siperp -g www-data -m 0755 "$DIR"
  as_app git -C "$SOURCE" archive "$SHA" | as_app tar -x -C "$DIR"
  if [[ -d $DIR/api/storage && ! -L $DIR/api/storage ]]; then mv "$DIR/api/storage" "$DIR/api/storage.git-skeleton"; fi
  ln -s "$SOURCE/api/storage" "$DIR/api/storage"
  ln -s "$SOURCE/api/.env" "$DIR/api/.env"
  for file in .env .env.local .env.production .env.production.local; do
    if [[ -f $OLD_DIR/$file ]]; then install -o siperp -g www-data -m 0640 "$OLD_DIR/$file" "$DIR/$file"; fi
  done
  if [[ -d $SOURCE/public/uploads ]]; then ln -s "$SOURCE/public/uploads" "$DIR/public/uploads"; fi
  if [[ -L $SOURCE/api/public/storage ]]; then ln -s "$SOURCE/api/storage/app/public" "$DIR/api/public/storage"; fi
  chown -R siperp:www-data "$DIR/api/bootstrap/cache"
  chmod 2770 "$DIR/api/bootstrap/cache"
  as_app bash -c 'set -e; cd "$1/api"; composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader; /usr/bin/php8.4 artisan config:cache' -- "$DIR"
  as_app bash -c 'set -e; cd "$1"; npm ci --no-audit --no-fund' -- "$DIR"
  meta config "$ID"
  chown siperp:www-data "$DIR/ecosystem.release.json"
  meta phase "$ID" installed
  PHASE=installed
  build_release
}

switch_release() {
  local kind=${1:?} target=${2:-}
  OLD=$(meta active)
  if [[ $kind == rollback ]]; then ID=$(meta previous); else ID=${target:?Release ID required.}; fi
  meta check-switch "$ID" "$kind"
  record "$OLD"
  OLD_DIR=$DIR
  record "$ID"
  if [[ $kind == activate ]]; then meta inputs "$ID"; fi
  plan_now
  [[ $(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).length' "$BASE/plans/$ID.json") == 0 ]] || { echo 'Pending migrations. Stop.' >&2; exit 1; }
  health "$WEB_PORT"
  assert_deployment "http://127.0.0.1:$WEB_PORT/" "$ID"
  SETTINGS=$(as_app /usr/bin/php8.4 "$HERE/queue-settings.php" "$DIR")
  read -r WORKER_TIMEOUT STOP_TIMEOUT <<< "$SETTINGS"
  [[ $WORKER_TIMEOUT =~ ^[0-9]+$ && $STOP_TIMEOUT =~ ^[0-9]+$ ]] || exit 1
  backup
  meta routing "$ID" > "$TX/routing.next.conf"
  cat > "$TX/worker.next.conf" <<EOF
[Service]
WorkingDirectory=$DIR/api
ExecStart=
ExecStart=/usr/bin/php8.4 $DIR/api/artisan queue:work payment --queue=callbacks,receipts --sleep=3 --tries=3 --timeout=$WORKER_TIMEOUT
TimeoutStopSec=$STOP_TIMEOUT
KillMode=mixed
SendSIGKILL=no
EOF
  exec 8>>"$BASE/shared/scheduler.lock"
  echo '=== Waiting for the current scheduler invocation to finish ==='
  flock -w 360 8
  MODE=switch
  stop_worker
  atomic_file "$TX/worker.next.conf" "$WORKER"
  systemctl daemon-reload
  point_current "$DIR"
  systemctl start siperp-worker
  systemctl is-active --quiet siperp-worker
  atomic_file "$TX/routing.next.conf" "$MAP"
  nginx -t
  systemctl reload nginx
  public_health
  assert_deployment https://erp.lazsip.or.id/ "$ID"
  meta switched "$ID" "$kind"
  MODE=none
  flock -u 8
  echo "RELEASE_ACTIVE: $ID"
  echo "Rollback: bash $HERE/release.sh rollback"
}

retire_release() {
  local policy=${2:-manual}
  ID=${1:?Release ID required.}
  meta retire-check "$ID" "$policy"
  record "$ID"
  backup
  meta routing "$(meta active)" "$ID" > "$TX/routing.next.conf"
  atomic_file "$TX/routing.next.conf" "$MAP"
  if ! nginx -t; then atomic_file "$TX/routing.original.conf" "$MAP"; exit 1; fi
  MODE=retire
  systemctl reload nginx
  if as_app pm2 describe "$NAME" >/dev/null 2>&1; then as_app pm2 delete "$NAME"; fi
  [[ -f $API_FILE ]] && unlink "$API_FILE"
  nginx -t
  systemctl reload nginx
  meta retired "$ID" "$policy"
  as_app pm2 save
  public_health
  MODE=none
  echo "RETIRED: $ID. Files/backups retained; no directory or storage was deleted."
}

cleanup_obsolete() {
  local obsolete old_id
  obsolete=$(meta cleanup-candidates)
  while IFS= read -r old_id; do
    [[ -n $old_id ]] || continue
    echo "=== Releasing obsolete process $old_id; active and previous are protected ==="
    retire_release "$old_id" automatic
  done <<< "$obsolete"
}

update_release() {
  local requested=${1:-main}
  [[ $requested == main || $requested =~ ^[a-f0-9]{7,40}$ ]] || { echo 'Use main or a merged commit SHA.' >&2; return 1; }
  UPDATE_NOOP=0
  public_health
  cleanup_obsolete
  prepare_release "$requested"
  if (( UPDATE_NOOP )); then
    echo "UPDATE_COMPLETE: $(meta active) (already up to date)."
    return 0
  fi
  local prepared=$ID
  record "$prepared"
  if [[ $PHASE == awaiting-migration ]]; then
    echo "UPDATE_PAUSED: $prepared needs migration review. Active release is unchanged."
    return 0
  fi
  [[ $PHASE == ready ]] || { echo "Release is not ready; update stopped." >&2; return 1; }
  switch_release activate "$prepared"
  cleanup_obsolete
  echo "UPDATE_COMPLETE: $(meta active)"
  meta status
}

case "$ACTION" in
update)
  update_release "${2:-main}"
  ;;
prepare)
  prepare_release "${2:-main}"
  ;;
build)
  ID=${2:?Release ID required.}
  record "$ID"
  MODE=prepare
  build_release
  ;;
inspect)
  ID=${2:?Release ID required.}
  record "$ID"
  plan_now
  meta plan "$ID" "$BASE/plans/$ID.json"
  echo 'Review these migration sources for compatibility with ALL retained releases, workers and callbacks:'
  as_app git -C "$SOURCE" show --format= --stat "$COMMIT" -- api/database/migrations
  for file in "$DIR"/api/database/migrations/*.php; do
    if grep -q '"name":"'"$(basename "$file" .php)"'"' "$BASE/plans/$ID.json"; then
      echo "=== $(basename "$file") ==="; cat "$file"
    fi
  done
  ;;
migrate)
  ID=${2:?Release ID required.}; TOKEN=${3:?Review token required.}
  [[ ${4:-} == --reviewed-compatible ]] || { echo 'Review additive compatibility before using --reviewed-compatible.' >&2; exit 1; }
  record "$ID"
  meta inputs "$ID"
  plan_now
  meta check-plan "$ID" "$BASE/plans/$ID.json" "$TOKEN"
  backup
  MODE=migrate
  app_php migrate --force
  meta migrated "$ID"
  app_php config:cache
  plan_now
  meta plan "$ID" "$BASE/plans/$ID.json"
  [[ $(meta count-plan "$ID") == 0 ]] || exit 1
  meta phase "$ID" installed
  printf '%s\n' "$TOKEN" > "$TX/reviewed-compatible-token"
  MODE=none
  echo "MIGRATION_READY: $ID. Continue with: bash $HERE/release.sh build $ID"
  ;;
activate|rollback)
  switch_release "$ACTION" "${2:-}"
  ;;
retire)
  [[ ${3:-} == --ack-old-tabs-reload ]] || { echo 'Retirement may require old tabs to reload; use --ack-old-tabs-reload after review.' >&2; exit 1; }
  retire_release "${2:?Release ID required.}" manual
  ;;
*) echo 'Commands: update [main|SHA] | init | status | prepare [main|SHA] | inspect ID | migrate ID TOKEN --reviewed-compatible | build ID | activate ID | rollback | retire ID --ack-old-tabs-reload' >&2; exit 1 ;;
esac
