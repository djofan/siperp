#!/usr/bin/env bash
# Resume only a baseline whose dependencies/build have completed. No rebuild/migration.
set -Eeuo pipefail
umask 0027
[[ $EUID == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
ID=${1:?Pass the ID of the existing baseline release.}
[[ $ID =~ ^[0-9]{14}-[a-f0-9]{12}$ ]] || { echo 'Invalid release ID.' >&2; exit 1; }
BASE=/var/www/siperp-deploy
RELEASE="$BASE/releases/$ID"
NAME="siperp-candidate-$ID"
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
NGINX_FILE=/etc/nginx/conf.d/siperp-candidate-api.conf
PUBLIC_HOST=erp.lazsip.or.id
exec 9>/run/lock/siperp-release.lock
flock -n 9 || { echo 'Another release operation is running.' >&2; exit 1; }
as_app() { sudo -H -u siperp -- "$@"; }
COMMIT=$(as_app git -C /var/www/siperp rev-parse HEAD)
[[ $ID == *-"${COMMIT:0:12}" ]] || { echo 'Live commit changed. Stop and review the baseline.' >&2; exit 1; }
[[ -z $(as_app git -C /var/www/siperp status --porcelain) ]] || { echo 'Live checkout has changes.' >&2; exit 1; }
[[ -d $RELEASE && ! -L $RELEASE && -s $RELEASE/.next/BUILD_ID &&
   ( -f $RELEASE/ecosystem.release.json || -f $RELEASE/ecosystem.release.cjs ) && -f $RELEASE/api/vendor/autoload.php &&
   -f $RELEASE/api/bootstrap/cache/config.php && -f $HERE/runtime.cjs ]] || {
  echo 'Incomplete build or dependencies. Stop; do not rebuild in the live checkout.' >&2; exit 1;
}
[[ ! -e $NGINX_FILE && ! -e $BASE/baseline-ready ]] || {
  echo 'Candidate state/config already exists. Inspect it first.' >&2; exit 1;
}
[[ -z $(ss -H -ltn '( sport = :3101 or sport = :8101 )') ]] || { echo 'Candidate ports are occupied.' >&2; exit 1; }
if as_app pm2 describe "$NAME" >/dev/null 2>&1; then
  echo 'Candidate process already exists. Inspect it first.' >&2; exit 1;
fi
as_app node "$HERE/runtime.cjs" repair-config "$RELEASE" "$ID"
BAD_ID=$(as_app pm2 jlist | as_app node "$HERE/runtime.cjs" misstarted-process-id "$RELEASE")
if [[ -n $BAD_ID ]]; then
  # The helper matches BOTH the mistaken name and exact candidate script path.
  # Never delete by name alone and never restart/delete siperp-web.
  as_app pm2 delete "$BAD_ID"
fi
curl --fail --silent --show-error --max-time 20 "https://$PUBLIC_HOST/api/health" |
  node "$HERE/runtime.cjs" health
nginx -t

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
    echo 'Resume failed; public upstream remains unchanged. Release files retained.' >&2
  fi
  exit "$result"
}
trap cleanup EXIT
NGINX_CREATED=1
cat > "$NGINX_FILE" <<EOF
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
echo '=== Waiting for candidate API after graceful reload ==='
node "$HERE/runtime.cjs" wait-health http://127.0.0.1:8101/api/v1/health
PM2_CREATED=1
as_app pm2 start "$RELEASE/ecosystem.release.json" --only "$NAME"
echo '=== Waiting for candidate frontend ==='
node "$HERE/runtime.cjs" wait-health http://127.0.0.1:3101/api/health
curl --fail --silent --show-error --max-time 30 -H "Host: $PUBLIC_HOST" http://127.0.0.1:3101/ >/dev/null
curl --fail --silent --show-error --max-time 30 -H "Host: $PUBLIC_HOST" http://127.0.0.1:3101/lazsip >/dev/null
curl --fail --silent --show-error --max-time 20 "https://$PUBLIC_HOST/api/health" |
  node "$HERE/runtime.cjs" health
printf '%s\n' "$ID" > "$BASE/baseline-ready"
chmod 0600 "$BASE/baseline-ready"
echo "CANDIDATE_READY: $ID"
echo 'Public traffic, worker and scheduler have NOT been switched. No rebuild or migration ran.'
