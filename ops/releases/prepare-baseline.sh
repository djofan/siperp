#!/usr/bin/env bash
# First installation only: prepare the SAME commit as the live checkout.
# Does not change the public upstream, migrate, restart FPM, or touch cron/workers.
set -Eeuo pipefail
umask 0027

LEGACY=/var/www/siperp
BASE=/var/www/siperp-deploy
PUBLIC_HOST=erp.lazsip.or.id
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PHP=/usr/bin/php8.4
NGINX_FILE=/etc/nginx/conf.d/siperp-candidate-api.conf
[[ $EUID == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
for tool in git node npm composer nginx curl ss flock tar sudo; do
  command -v "$tool" >/dev/null || { echo "Missing command: $tool" >&2; exit 1; }
done
[[ -x $PHP && -f $HERE/runtime.cjs ]] || { echo 'Missing PHP or runtime.cjs.' >&2; exit 1; }
(( $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) >= 2097152 )) || {
  echo 'Less than 2 GiB available RAM; prepare on a build server instead.' >&2; exit 1;
}
(( $(df -Pk /var/www | awk 'NR==2 {print $4}') >= 5242880 )) || {
  echo 'Less than 5 GiB disk available for an isolated release.' >&2; exit 1;
}
exec 9>/run/lock/siperp-release.lock
flock -n 9 || { echo 'Another release operation is running.' >&2; exit 1; }

as_app() { sudo -H -u siperp -- "$@"; }
app_git() { as_app git -C "$LEGACY" "$@"; }
[[ $(app_git branch --show-current) == main ]] || { echo 'Legacy checkout must be main.' >&2; exit 1; }
[[ -z $(app_git status --porcelain) ]] || { echo 'Legacy checkout has local changes; stop.' >&2; exit 1; }
[[ -f $LEGACY/api/.env && -d $LEGACY/api/storage ]] || exit 1
[[ -S /run/php/php8.4-fpm.sock ]] || { echo 'PHP-FPM socket is unavailable.' >&2; exit 1; }
[[ ! -e $BASE/baseline-ready && ! -e $NGINX_FILE ]] || {
  echo 'Candidate already exists. Inspect it before preparing again.' >&2; exit 1;
}
[[ -z $(ss -H -ltn '( sport = :3101 or sport = :8101 )') ]] || {
  echo 'Candidate ports 3101/8101 are already in use.' >&2; exit 1;
}
curl --fail --silent --show-error --max-time 20 "https://$PUBLIC_HOST/api/health" |
  node "$HERE/runtime.cjs" health
nginx -t
COMMIT=$(app_git rev-parse HEAD)
ID="$(date -u +%Y%m%d%H%M%S)-${COMMIT:0:12}"
RELEASE="$BASE/releases/$ID"
NAME="siperp-candidate-$ID"
install -d -m 0755 "$BASE" "$BASE/releases"
install -d -o siperp -g www-data -m 0750 "$BASE/shared"
install -d -o siperp -g www-data -m 0755 "$RELEASE"
install -d -m 0700 "$BASE/audit/$ID"
cp -a /etc/nginx/sites-available/siperp-web "$BASE/audit/$ID/"
cp -a /etc/nginx/sites-available/siperp-api "$BASE/audit/$ID/"
systemctl cat siperp-worker > "$BASE/audit/$ID/worker.txt"

# Failure cleanup touches only the candidate this invocation created, never live processes.
NGINX_CREATED=0
PM2_CREATED=0
cleanup() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    if (( PM2_CREATED )); then as_app pm2 delete "$NAME" >/dev/null 2>&1 || true; fi
    if (( NGINX_CREATED )); then
      unlink "$NGINX_FILE"
      if nginx -t; then systemctl reload nginx; fi
    fi
    echo "Preparation failed. Public upstream was not changed. Files kept at $RELEASE" >&2
  fi
  exit "$result"
}
trap cleanup EXIT

echo "=== Export immutable baseline $COMMIT ==="
app_git archive "$COMMIT" | as_app tar -x -C "$RELEASE"
for file in .env .env.local .env.production .env.production.local; do
  if [[ -f $LEGACY/$file ]]; then
    install -o siperp -g www-data -m 0640 "$LEGACY/$file" "$RELEASE/$file"
  fi
done
# Do not copy/move uploads or sessions. The original directory remains persistent.
# Remove only files exported from Git inside the freshly-created candidate storage.
[[ $RELEASE == "$BASE/releases/$ID" && ! -L $RELEASE/api/storage ]] || exit 1
if [[ -d $RELEASE/api/storage ]]; then
  mv "$RELEASE/api/storage" "$RELEASE/api/storage.git-skeleton"
fi
ln -s "$LEGACY/api/storage" "$RELEASE/api/storage"
ln -s "$LEGACY/api/.env" "$RELEASE/api/.env"
if [[ -d $LEGACY/public/uploads ]]; then
  [[ ! -e $RELEASE/public/uploads ]] || { echo 'Tracked public/uploads needs manual review.' >&2; exit 1; }
  ln -s "$LEGACY/public/uploads" "$RELEASE/public/uploads"
fi
if [[ -L $LEGACY/api/public/storage ]]; then
  [[ ! -e $RELEASE/api/public/storage && ! -L $RELEASE/api/public/storage ]] || exit 1
  ln -s "$LEGACY/api/storage/app/public" "$RELEASE/api/public/storage"
fi
chown -R siperp:www-data "$RELEASE/api/bootstrap/cache"
chmod 2770 "$RELEASE/api/bootstrap/cache"
as_app bash -c 'set -e; cd "$1/api"; composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader; "$2" artisan config:cache; "$2" artisan migrate:status --pending=2 --no-ansi' -- "$RELEASE" "$PHP"
as_app bash -c 'set -e; cd "$1"; npm ci --no-audit --no-fund' -- "$RELEASE"
as_app pm2 jlist | as_app node "$HERE/runtime.cjs" snapshot "$RELEASE" "$LEGACY" "$BASE/shared" "$ID"
as_app node "$HERE/runtime.cjs" build "$RELEASE"

NGINX_CREATED=1
cat > "$NGINX_FILE" <<EOF
# Candidate only. Public requests continue to use the original Nginx sites.
server {
    listen 127.0.0.1:8101;
    server_name localhost;
    root $RELEASE/api/public;
    index index.php;
    client_max_body_size 60m;
    location / { try_files \$uri \$uri/ /index.php?\$query_string; }
    location = /index.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root/index.php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_read_timeout 300s;
    }
    location ~ \\.php\$ { return 404; }
    location ~ /\\. { deny all; }
}
EOF
nginx -t
systemctl reload nginx
node "$HERE/runtime.cjs" wait-health http://127.0.0.1:8101/api/v1/health
PM2_CREATED=1
as_app pm2 start "$RELEASE/ecosystem.release.json" --only "$NAME"
READY=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 10 -H "Host: $PUBLIC_HOST" http://127.0.0.1:3101/api/health |
      node "$HERE/runtime.cjs" health; then READY=1; break; fi
  sleep 2
done
(( READY )) || { echo 'Candidate frontend failed readiness.' >&2; exit 1; }
curl --fail --silent --show-error --max-time 30 -H "Host: $PUBLIC_HOST" http://127.0.0.1:3101/ >/dev/null
curl --fail --silent --show-error --max-time 30 -H "Host: $PUBLIC_HOST" http://127.0.0.1:3101/lazsip >/dev/null
curl --fail --silent --show-error --max-time 20 "https://$PUBLIC_HOST/api/health" |
  node "$HERE/runtime.cjs" health
printf '%s\n' "$ID" > "$BASE/baseline-ready"
chmod 0600 "$BASE/baseline-ready"
echo "CANDIDATE_READY: $ID"
echo 'Candidate frontend 127.0.0.1:3101; API 127.0.0.1:8101.'
echo 'Public traffic, worker and scheduler have NOT been switched. No migration ran.'
echo 'Do not run the old in-place update commands while preparing the handover.'
