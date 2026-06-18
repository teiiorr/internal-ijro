#!/usr/bin/env bash
# =========================================================================
# First-time VPS setup for Ichki Ijro on a fresh Ubuntu 22.04 / 24.04 box.
# Run as root or with sudo:   bash setup-server.sh
# Idempotent — safe to re-run if it fails partway through.
# =========================================================================
set -euo pipefail

APP_USER="ichki-ijro"
APP_DIR="/srv/ichki-ijro"
UPLOAD_DIR="/var/lib/ichki-ijro/uploads"
DB_NAME="ichki_ijro"
DB_USER="ichki_ijro"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
NODE_MAJOR=22

bold() { printf "\n\033[1;36m>> %s\033[0m\n" "$*"; }

bold "1/8 apt update + base packages"
apt-get update -y
apt-get install -y curl ca-certificates gnupg lsb-release ufw fail2ban \
  build-essential rsync openssl git

bold "2/8 Node.js ${NODE_MAJOR}.x via NodeSource"
if ! command -v node >/dev/null || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@latest --activate

bold "3/8 PostgreSQL 16"
if ! command -v psql >/dev/null; then
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

# Create role + database if they don't exist yet.
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O ${DB_USER} ${DB_NAME}
echo "DB ready → postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"

bold "4/8 Nginx + Certbot"
apt-get install -y nginx certbot python3-certbot-nginx

bold "5/8 App user + directory layout"
id "${APP_USER}" &>/dev/null || useradd --system --create-home --home-dir /home/${APP_USER} --shell /bin/bash ${APP_USER}
mkdir -p ${APP_DIR}/{releases,shared}
mkdir -p ${UPLOAD_DIR}
chown -R ${APP_USER}:${APP_USER} ${APP_DIR} ${UPLOAD_DIR}

bold "6/8 systemd unit"
cp "$(dirname "$0")/ichki-ijro.service" /etc/systemd/system/ichki-ijro.service
systemctl daemon-reload
systemctl enable ichki-ijro.service

bold "7/8 Firewall (ufw) + fail2ban"
ufw allow OpenSSH || true
ufw allow "Nginx Full" || true
ufw --force enable
systemctl enable --now fail2ban

bold "8/8 .env template"
if [ ! -f "${APP_DIR}/shared/.env.production" ]; then
  cp "$(dirname "$0")/../.env.production.example" "${APP_DIR}/shared/.env.production"
  # Pre-fill the DB password so the first run already works.
  sed -i "s|CHANGE_ME_STRONG_PASSWORD|${DB_PASSWORD}|" "${APP_DIR}/shared/.env.production"
  SECRET=$(openssl rand -base64 32)
  sed -i "s|CHANGE_ME_BASE64_RANDOM_32_BYTES|${SECRET}|" "${APP_DIR}/shared/.env.production"
  chown ${APP_USER}:${APP_USER} "${APP_DIR}/shared/.env.production"
  chmod 600 "${APP_DIR}/shared/.env.production"
  echo "Wrote ${APP_DIR}/shared/.env.production — edit APP_URL + SMTP before first deploy."
else
  echo ".env.production already present — left untouched."
fi

cat <<EOF

================================================================
 Setup complete. Next steps:

 1. Edit ${APP_DIR}/shared/.env.production
    - set APP_URL / AUTH_URL to your real domain
    - fill SMTP_* if you want emails

 2. Copy nginx config:
      cp $(dirname "$0")/nginx.conf /etc/nginx/sites-available/ichki-ijro
      ln -sf /etc/nginx/sites-available/ichki-ijro /etc/nginx/sites-enabled/
      nginx -t && systemctl reload nginx

 3. Issue HTTPS cert (replace domain):
      certbot --nginx -d ijro.bkrm.uz

 4. From your laptop, deploy the first release:
      cd /path/to/ichki-ijro-repo
      DEPLOY_HOST=root@your.server.ip bash deploy/deploy.sh

 5. Crontab for daily backups (run as root):
      0 3 * * * /srv/ichki-ijro/current/deploy/backup.sh >> /var/log/ichki-backup.log 2>&1
================================================================
EOF
