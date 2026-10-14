#!/usr/bin/env bash
#
# Fix Turbopack `serverExternalPackages` symlinks after shipping a `.next` that
# was BUILT ON A DIFFERENT MACHINE than the server (e.g. a Mac where the repo is
# nested as .../internal-ijro/ichki-ijro/ → the droplet where it lives at
# /opt/markaz-ijro/app). Turbopack writes `.next/node_modules/<pkg>-<hash>` as
# RELATIVE symlinks into the builder's node_modules; those relative paths don't
# resolve on the server, so exceljs / @react-pdf/renderer / sharp fail at runtime
# with "Failed to load external module <pkg>-<hash>: Cannot find module".
#
# This repoints every BROKEN external symlink to the app's real node_modules
# (absolute, so depth doesn't matter). Idempotent — links that already resolve
# are skipped. Run it right after rsyncing a cross-built .next, before restart.
#
# Usage:  bash deploy/fix-next-externals.sh [APP_DIR]   (default /opt/markaz-ijro/app)
#
# The proper long-term fix is to build .next ON the server (or in CI on the same
# layout); this script is the safety net for the Mac-build-and-ship flow.
set -euo pipefail
APP_DIR="${1:-/opt/markaz-ijro/app}"
NM="${APP_DIR}/.next/node_modules"
[ -d "${NM}" ] || { echo "no ${NM} (nothing to fix)"; exit 0; }

fixed=0
while IFS= read -r link; do
  [ -e "${link}" ] && continue                     # already resolves → leave it
  tgt="$(readlink "${link}")"
  rel="${tgt##*/node_modules/}"                     # path after the last node_modules/
  [ "${rel}" = "${tgt}" ] && continue              # not an into-node_modules link
  ln -sfn "${APP_DIR}/node_modules/${rel}" "${link}"
  echo "repointed $(basename "${link}") -> node_modules/${rel}"
  fixed=$((fixed + 1))
done < <(find "${NM}" -type l)

echo "fixed ${fixed} external symlink(s)"
