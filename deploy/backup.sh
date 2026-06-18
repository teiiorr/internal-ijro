#!/usr/bin/env bash
# =========================================================================
# Daily backup — Postgres dump + uploads dir, kept 14 days locally.
# Add an off-site sync (rclone to Backblaze B2 / S3) below for safety.
#
# Cron suggestion (as root):
#   0 3 * * * /srv/ichki-ijro/current/deploy/backup.sh >> /var/log/ichki-backup.log 2>&1
# =========================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/ichki-ijro"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/ichki-ijro/uploads}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
KEEP_DAYS=14

# Load DB connection from the production env file.
ENV_FILE="/srv/ichki-ijro/shared/.env.production"
if [ -f "${ENV_FILE}" ]; then
  set -a; . "${ENV_FILE}"; set +a
fi
: "${DATABASE_URL:?DATABASE_URL not set}"

mkdir -p "${BACKUP_DIR}"

echo "▸ pg_dump"
pg_dump --no-owner --no-acl --format=custom "${DATABASE_URL}" \
  > "${BACKUP_DIR}/db-${STAMP}.dump"

echo "▸ uploads tar"
if [ -d "${UPLOAD_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/uploads-${STAMP}.tar.gz" -C "$(dirname "${UPLOAD_DIR}")" "$(basename "${UPLOAD_DIR}")"
fi

echo "▸ prune older than ${KEEP_DAYS} days"
find "${BACKUP_DIR}" -type f -mtime +${KEEP_DAYS} -delete

# --- Off-site sync (uncomment after configuring rclone) ---
# rclone copy "${BACKUP_DIR}" b2:ichki-ijro-backups/ --include "*-${STAMP}.*"

echo "✓ backup ${STAMP}"
ls -lh "${BACKUP_DIR}" | tail -n 5
