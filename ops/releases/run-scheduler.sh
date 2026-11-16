#!/usr/bin/env bash
set -euo pipefail
umask 0007
BASE=/var/www/siperp-deploy
exec 8>"$BASE/shared/scheduler.lock"
flock -n 8 || exit 0
TARGET=$(readlink -f "$BASE/current")
if [[ $TARGET != /var/www/siperp && ! $TARGET =~ ^/var/www/siperp-deploy/releases/[0-9]{14}-[a-f0-9]{12}$ ]]; then
  echo 'Invalid active release.' >&2; exit 1
fi
cd "$TARGET/api"
exec /usr/bin/php8.4 artisan schedule:run
