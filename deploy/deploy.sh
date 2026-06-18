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

# Bundle the standalone server + everything Next/migrate/backup need at runtime.
# We stage into a tmp dir with rsync (preserves symlinks correctly, unlike cp -r
# which dereferences and chokes on pnpm's symlink graph), then tar once.
echo "▸ Preparing release tarball…"
TMP="$(mktemp -d)"
STAGE="${TMP}/release"
mkdir -p "${STAGE}/.next" "${STAGE}/scripts"

rsync -a .next/standalone/ "${STAGE}/"
rsync -a .next/static "${STAGE}/.next/"
rsync -a public "${STAGE}/"
rsync -a drizzle "${STAGE}/"
rsync -a deploy "${STAGE}/"
[ -f scripts/migrate.ts ] && cp scripts/migrate.ts "${STAGE}/scripts/" || true

TARBALL="${TMP}/release.tgz"
tar -czf "${TARBALL}" -C "${STAGE}" .
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

# Run migrations against the prod DB. Migrator needs deps that standalone
# tree-shakes (drizzle-orm/migrator, postgres). Install them globally once;
# subsequent deploys reuse the cache.
echo "▸ Running migrations…"
cd "\${RELEASE_DIR}"
if ! command -v tsx >/dev/null; then
  npm i -g tsx drizzle-orm postgres dotenv >/dev/null 2>&1
else
  # Ensure migrator deps are present even if tsx already was.
  npm ls -g drizzle-orm >/dev/null 2>&1 || npm i -g drizzle-orm postgres dotenv >/dev/null 2>&1
fi
set -a
. "${DEPLOY_PATH}/shared/.env.production"
set +a
NODE_PATH="\$(npm root -g)" tsx scripts/migrate.ts

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
