#!/usr/bin/env bash
set -euo pipefail

HOST="root@64.226.65.211"
REMOTE="/opt/markaz-ijro/app"

echo "▸ 1/4  Building…"
CI=true NODE_OPTIONS='--max-old-space-size=4096' npx next build

echo "▸ 2/4  Stopping service…"
ssh "$HOST" "systemctl stop markaz-ijro || true"

echo "▸ 3/4  Syncing…"
rsync -az --delete \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='uploads' \
  --exclude='.git' \
  --exclude='src' \
  --exclude='deploy.sh' \
  .next/ "$HOST:$REMOTE/.next/"

rsync -az public/ "$HOST:$REMOTE/public/"

rsync -az --delete \
  node_modules/ "$HOST:$REMOTE/node_modules/"

rsync -az drizzle/ "$HOST:$REMOTE/drizzle/"
rsync -az package.json "$HOST:$REMOTE/package.json"

echo "▸ 4/4  Starting service…"
ssh "$HOST" "ln -sfn /var/lib/markaz-ijro/uploads $REMOTE/uploads 2>/dev/null; systemctl start markaz-ijro"
sleep 3
ssh "$HOST" "systemctl is-active markaz-ijro && echo '✓ Service running' || (journalctl -u markaz-ijro -n 15 --no-pager && exit 1)"
