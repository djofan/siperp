#!/usr/bin/env bash
# Explicit installation only; ordinary web deployments do not run this script.
set -Eeuo pipefail
umask 0027
[[ $EUID == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DEST=/usr/local/lib/siperp-rapat
UNIT=/etc/systemd/system/siperp-rapat-worker.service
[[ -L /var/www/siperp-deploy/current ]] || { echo 'Release manager current link missing.' >&2; exit 1; }
id siperp >/dev/null
getent group www-data >/dev/null
/usr/bin/php8.4 -r 'exit(extension_loaded("pcntl") ? 0 : 1);'
/usr/bin/php8.4 -l "$HERE/worker.php"
bash -n "$HERE/run-worker.sh"
exec 9>/run/lock/siperp-release.lock
flock -n 9 || { echo 'Another release operation is running.' >&2; exit 1; }
BACKUP=$(mktemp -d /root/siperp-rapat-worker-backup.XXXXXX)
for name in worker.php run-worker.sh; do
  if [[ -f $DEST/$name ]]; then cp -p "$DEST/$name" "$BACKUP/$name"; fi
done
if [[ -f $UNIT ]]; then cp -p "$UNIT" "$BACKUP/siperp-rapat-worker.service"; fi
if [[ $(systemctl show -p LoadState --value siperp-rapat-worker.service) != not-found ]]; then
  # Graceful stop may wait for an in-flight meeting; never kill all PHP/Python workers.
  systemctl stop siperp-rapat-worker.service
fi
install -d -o root -g root -m 0755 "$DEST"
install -o root -g root -m 0644 "$HERE/worker.php" "$DEST/worker.php"
install -o root -g root -m 0755 "$HERE/run-worker.sh" "$DEST/run-worker.sh"
install -o root -g root -m 0644 "$HERE/siperp-rapat-worker.service" "$UNIT"
# Keep existing operator drop-ins. The previously installed 95-persistent-loop.conf
# selects this same wrapper and Restart=on-failure and can remain in place.
systemd-analyze verify "$UNIT"
systemctl daemon-reload
systemctl reset-failed siperp-rapat-worker.service
systemctl enable --now siperp-rapat-worker.service
sleep 2
systemctl is-active --quiet siperp-rapat-worker.service
systemctl show siperp-rapat-worker.service -p ActiveState -p SubState -p NRestarts
echo "RAPAT_WORKER_INSTALLED; backup: $BACKUP"
