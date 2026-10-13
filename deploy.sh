#!/usr/bin/env bash
# =============================================================================
# Ichki Ijro — manual deploy from a Mac to the production droplet.
#
# WHAT WAS WRONG BEFORE (and is fixed here)
#   1. The old script built on the Mac and rsynced darwin-arm64 node_modules to
#      a Linux box → sharp/esbuild/@parcel/watcher crash at runtime. It also
#      EXCLUDED src/, but the tsx cron worker needs src/ + tsconfig.json + the
#      devDep `tsx`, so the worker broke on every deploy.
#        FIX: we build ON THE DROPLET (Linux). `pnpm install --frozen-lockfile`
#        compiles every native module for linux/amd64, and the full source tree
#        (src/, scripts/, tsconfig.json, devDeps incl. tsx) lives in the release
#        dir, so BOTH the app and the worker have everything they need.
#   2. Old flow was stop → rsync --delete → start: downtime + no rollback.
#        FIX: build the new release alongside the running one, then atomic
#        symlink swap of `current`. Previous release is kept for instant
#        rollback (and this script rolls back automatically on a failed smoke).
#   3. No gated DB migration.
#        FIX: `pnpm db:migrate` runs BEFORE the swap; a migration failure aborts
#        the deploy with the old release still serving.
#   4. Only `systemctl is-active` was checked — a booted-but-broken app passed.
#        FIX: post-deploy smoke check curls /api/health and must get HTTP 200,
#        otherwise the deploy rolls back and exits non-zero.
#
# PREFER CI FOR ROUTINE DEPLOYS. The droplet is a 2 GB box shared with Postgres;
# `next build` wants ~4 GB (2 GB RAM + the 2 GB swap that deploy/setup-server.sh
# provisions). It works, but the GitHub Actions path (.github/workflows/
# deploy.yml) builds on a roomy Linux runner and ships the built artifact, which
# never stresses the droplet. Use this script for hotfixes / when CI is down.
#
# USAGE
#   bash deploy.sh
#   DEPLOY_HOST=ijro@64.226.65.211 DEPLOY_PATH=/opt/markaz-ijro bash deploy.sh
#
# ONE-TIME SERVER PREREQUISITES (need root — see DEPLOY.md):
#   * Node 22 + corepack/pnpm, Postgres, nginx already installed.
#   * The systemd unit `markaz-ijro` has WorkingDirectory=$DEPLOY_PATH/current
#     and EnvironmentFile=$DEPLOY_PATH/shared/.env.production.
#   * $DEPLOY_PATH/shared/.env.production exists (secrets; survives deploys).
#   * The deploy user can `sudo systemctl restart markaz-ijro` (+ the worker).
# =============================================================================
set -euo pipefail

# ---- Config (override via env) ----------------------------------------------
# Defaults target the live BKRM droplet. These values come from the project's
# deploy records; change them with env vars for any other environment.
DEPLOY_HOST="${DEPLOY_HOST:-ijro@64.226.65.211}"   # ssh target (user@ip)
DEPLOY_PATH="${DEPLOY_PATH:-/opt/markaz-ijro}"      # base dir: releases/, shared/, current
APP_SERVICE="${APP_SERVICE:-markaz-ijro}"           # systemd unit for the web app
WORKER_UNIT="${WORKER_UNIT:-markaz-ijro-worker}"    # systemd worker (service+timer); empty to skip
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/markaz-ijro/uploads}"  # persistent uploads (outside releases)
HEALTH_URL="${HEALTH_URL:-https://app.markaz-ijro.uz/api/health}"  # must return 200
SSH="${SSH:-ssh}"
RELEASE="$(date -u +%Y%m%d-%H%M%S)"

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }

say "Deploy ${RELEASE} → ${DEPLOY_HOST}:${DEPLOY_PATH}"

# ---- 1. Ship SOURCE ONLY to a fresh release dir -----------------------------
# No node_modules, no .next: those are built on the droplet (Linux). This is the
# whole point — nothing architecture-specific leaves the Mac.
RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE}"
say "1/6  Uploading source to ${RELEASE_DIR}"
$SSH "${DEPLOY_HOST}" "mkdir -p '${RELEASE_DIR}'"
rsync -az --delete \
  -e "$SSH" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='uploads' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.claude' \
  --exclude='coverage' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  ./ "${DEPLOY_HOST}:${RELEASE_DIR}/"

# ---- 2–6. Build + migrate + swap + restart + smoke, all on the droplet ------
# Everything below runs on Linux. We pass our config in as shell vars; the
# heredoc is quoted ('REMOTE') so nothing expands locally — values are injected
# via the leading `export`s instead, which keeps remote quoting sane.
say "2/6  Building on the droplet, migrating, swapping, restarting…"
$SSH "${DEPLOY_HOST}" \
  "export RELEASE_DIR='${RELEASE_DIR}' DEPLOY_PATH='${DEPLOY_PATH}' \
          APP_SERVICE='${APP_SERVICE}' WORKER_UNIT='${WORKER_UNIT}' \
          UPLOADS_DIR='${UPLOADS_DIR}' HEALTH_URL='${HEALTH_URL}'; bash -euo pipefail -s" <<'REMOTE'
set -euo pipefail
corepack enable >/dev/null 2>&1 || true

SHARED_ENV="${DEPLOY_PATH}/shared/.env.production"
[ -f "${SHARED_ENV}" ] || { echo "✗ ${SHARED_ENV} missing — create it first (see DEPLOY.md)"; exit 1; }

# Link persistent bits into the new release BEFORE building/running:
#   - uploads: user files live outside releases so a deploy never wipes them.
#   - .env.production: symlinked so `next start` / the worker / migrate all see it.
ln -sfn "${UPLOADS_DIR}" "${RELEASE_DIR}/uploads"
ln -sf  "${SHARED_ENV}"  "${RELEASE_DIR}/.env.production"

cd "${RELEASE_DIR}"

echo "  → pnpm install (Linux-native binaries, incl. devDeps for tsx worker)"
pnpm install --frozen-lockfile

echo "  → next build (standalone)"
CI=true NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# ---- Gated migration: BEFORE swapping traffic to the new release ----
# If this fails, we abort here — the OLD release is still live and untouched.
# (Migrations must be backwards-compatible with the currently-running code for
# the brief window until the swap: expand now, contract in a later release.)
echo "  → db:migrate (gated — abort on failure, old release stays live)"
set -a; . "${SHARED_ENV}"; set +a
pnpm db:migrate

# Remember where to roll back to, then atomically repoint `current`.
PREV="$(readlink -f "${DEPLOY_PATH}/current" 2>/dev/null || true)"
ln -sfn "${RELEASE_DIR}" "${DEPLOY_PATH}/current"

echo "  → restart ${APP_SERVICE}"
sudo systemctl restart "${APP_SERVICE}"
# Reload the worker units so the timer picks up the new release's code/deps.
if [ -n "${WORKER_UNIT}" ]; then
  sudo systemctl restart "${WORKER_UNIT}.timer" 2>/dev/null \
    || echo "  (worker timer ${WORKER_UNIT}.timer not installed yet — see DEPLOY.md)"
fi

# ---- Smoke check: app must actually answer 200 on /api/health ----
# Retry briefly to let the service boot. On failure, roll `current` back to the
# previous release, restart, and exit non-zero so CI/you know the deploy failed.
echo "  → smoke: GET ${HEALTH_URL}"
code=000
for i in 1 2 3 4 5 6; do
  code="$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 10 "${HEALTH_URL}" || echo 000)"
  [ "${code}" = "200" ] && break
  sleep 3
done

if [ "${code}" != "200" ]; then
  echo "✗ smoke failed (HTTP ${code}). Rolling back."
  if [ -n "${PREV}" ] && [ -d "${PREV}" ]; then
    ln -sfn "${PREV}" "${DEPLOY_PATH}/current"
    sudo systemctl restart "${APP_SERVICE}"
    echo "↩ rolled back to $(basename "${PREV}")"
  else
    echo "⚠ no previous release to roll back to — ${APP_SERVICE} may be down."
  fi
  echo "Recent logs:"; sudo journalctl -u "${APP_SERVICE}" -n 20 --no-pager || true
  exit 1
fi
echo "✓ smoke OK (HTTP 200)"

# Keep the last 5 releases for rollback; prune the rest.
cd "${DEPLOY_PATH}/releases"
ls -1t | tail -n +6 | xargs -r rm -rf
REMOTE

say "✓ Deployed release ${RELEASE} — ${HEALTH_URL} returned 200"
