#!/usr/bin/env bash
set -uo pipefail
child=''
stop_worker() {
  trap '' TERM INT
  if [[ -n "$child" ]]; then
    kill -TERM "$child" 2>/dev/null || true
    wait "$child" 2>/dev/null || true
  fi
  exit 0
}
trap stop_worker TERM INT

while true; do
  /usr/bin/php8.4 -d memory_limit=256M /usr/local/lib/siperp-rapat/worker.php &
  child=$!
  status=0
  wait "$child" || status=$?
  child=''
  if (( status != 0 )); then
    exit "$status"
  fi
  sleep 5 &
  child=$!
  wait "$child" || true
  child=''
done
