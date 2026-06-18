#!/usr/bin/env bash
# =========================================================================
# Deploy from your laptop: builds locally, ships .next/standalone + public
# + node_modules to the server, runs migrations, restarts systemd unit.
#
# Usage:
#   DEPLOY_HOST=root@1.2.3.4 bash deploy/deploy.sh
#
# Optional env:
#   DEPLOY_HOST   ssh target (REQUIRED)
#   DEPLOY_PATH   default /srv/ichki-ijro
#   APP_USER      default ichki-ijro
# =========================================================================
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST=root@server.ip}"
DEPLOY_PATH="${DEPLOY_PATH:-/srv/ichki-ijro}"
APP_USER="${APP_USER:-ichki-ijro}"
RELEASE="$(date -u +%Y%m%d-%H%M%S)"

echo "▸ Building locally (release ${RELEASE})…"
pnpm install --frozen-lockfile
pnpm test
pnpm build

# Bundle standalone server + the assets Next expects next to it.
echo "▸ Preparing release tarball…"
TMP="$(mktemp -d)"
mkdir -p "${TMP}/release"

# standalone server (server.js + minimal node_modules)
cp -r .next/standalone/. "${TMP}/release/"
# static assets — Next expects them at .next/static/
mkdir -p "${TMP}/release/.next"
cp -r .next/static "${TMP}/release/.next/static"
# public/ for fonts, logo, icon.svg, robots.txt etc
cp -r public "${TMP}/release/public"
# drizzle migration files for the migrate script
cp -r drizzle "${TMP}/release/drizzle"
mkdir -p "${TMP}/release/scripts"
cp scripts/migrate.ts "${TMP}/release/scripts/migrate.ts" 2>/dev/null || true
# carry deploy scripts so backup.sh / setup live with the release
cp -r deploy "${TMP}/release/deploy"

# Tarball it.
tar -czf "${TMP}/release.tgz" -C "${TMP}/release" .
echo "▸ Uploading $(du -h "${TMP}/release.tgz" | cut -f1)…"
scp -q "${TMP}/release.tgz" "${DEPLOY_HOST}:/tmp/ichki-ijro-${RELEASE}.tgz"

echo "▸ Activating release on remote…"
ssh "${DEPLOY_HOST}" bash -s <<REMOTE
set -euo pipefail
RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE}"
mkdir -p "\${RELEASE_DIR}"
tar -xzf "/tmp/ichki-ijro-${RELEASE}.tgz" -C "\${RELEASE_DIR}"
rm "/tmp/ichki-ijro-${RELEASE}.tgz"

# Symlink shared env into the release so systemd's EnvironmentFile path
# still resolves: /srv/ichki-ijro/current/.env.production -> shared/.env.production
ln -sf "${DEPLOY_PATH}/shared/.env.production" "\${RELEASE_DIR}/.env.production"

# Run migrations against the prod DB.
echo "▸ Running migrations…"
cd "\${RELEASE_DIR}"
# tsx is needed by scripts/migrate.ts — install lightly if missing.
if ! command -v tsx >/dev/null; then
  npm i -g tsx >/dev/null
fi
set -a
. "${DEPLOY_PATH}/shared/.env.production"
set +a
tsx scripts/migrate.ts

# Atomic swap of the "current" symlink.
ln -sfn "\${RELEASE_DIR}" "${DEPLOY_PATH}/current"
chown -R ${APP_USER}:${APP_USER} "\${RELEASE_DIR}" "${DEPLOY_PATH}/current"

# Restart the service.
systemctl restart ichki-ijro.service
sleep 2
systemctl --no-pager status ichki-ijro.service | head -n 10

# Keep last 5 releases, prune older.
cd "${DEPLOY_PATH}/releases"
ls -1t | tail -n +6 | xargs -r rm -rf
REMOTE

rm -rf "${TMP}"
echo "✓ Deployed release ${RELEASE}"
