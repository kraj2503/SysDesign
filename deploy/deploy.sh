#!/usr/bin/env bash
# SysDesignLab — Oracle Cloud Always Free deploy script.
#
# Runs on the VM, as root (sudo). Idempotent: safe to re-run after a code push.
#   cd /opt/sysdesignlab && sudo bash deploy/deploy.sh
#
# What it does:
#   1. installs system packages (nginx, build tools, python3 for native modules)
#   2. installs Node.js 22 via NodeSource if missing
#   3. npm install + builds the client
#   4. writes a root .env with NODE_ENV=production, PORT=4000, a fresh SESSION_SECRET
#      (keeps the existing file on re-runs so your secret + Google keys survive)
#   5. seeds the SQLite DB only if it doesn't exist yet (never wipes user data)
#   6. installs a systemd unit and nginx site, starts everything
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$APP_DIR/server"
ENV_FILE="$APP_DIR/.env"
APP_USER="sysdesignlab"
SERVICE_NAME="sysdesignlab"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/deploy.sh" >&2
  exit 1
fi

echo "==> SysDesignLab deploy"
echo "    app dir:  $APP_DIR"

# --- 1. system packages -----------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git nginx build-essential python3 pkg-config

# --- 2. Node.js 22 ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "==> node $(node -v) · npm $(npm -v)"

# --- 3. dedicated app user + ownership --------------------------------------
id -u "$APP_USER" &>/dev/null || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# --- 4. install + build as the app user --------------------------------------
cd "$APP_DIR"
sudo -u "$APP_USER" npm install --no-audit --no-fund
sudo -u "$APP_USER" npm run build

# --- 5. .env (idempotent) -----------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  umask 077
  {
    echo "NODE_ENV=production"
    echo "PORT=4000"
    echo "SESSION_SECRET=$(openssl rand -hex 32)"
    echo
    echo "# Google OAuth — optional. Uncomment and fill in to enable 'Sign in with Google':"
    echo "# GOOGLE_CLIENT_ID="
    echo "# GOOGLE_CLIENT_SECRET="
    echo "# GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback"
  } > "$ENV_FILE"
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "==> Wrote $ENV_FILE with a fresh SESSION_SECRET."
else
  echo "==> Keeping existing $ENV_FILE (SESSION_SECRET + Google keys preserved)."
fi

# --- 6. seed only on first deploy ---------------------------------------------
if [ ! -f "$SERVER_DIR/data/sysdesign.db" ]; then
  echo "==> No DB yet — seeding."
  sudo -u "$APP_USER" npm run seed
else
  echo "==> DB exists — skipping seed (user data preserved)."
fi

# --- 7. systemd unit -----------------------------------------------------------
install -m 644 "$APP_DIR/deploy/sysdesignlab.service" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

# --- 8. nginx ------------------------------------------------------------------
install -m 644 "$APP_DIR/deploy/nginx.sysdesignlab" "/etc/nginx/sites-available/$SERVICE_NAME"
ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/$SERVICE_NAME"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx >/dev/null 2>&1 || true
systemctl reload nginx

# --- 9. report -----------------------------------------------------------------
IP="$(curl -4 -s --max-time 5 http://checkip.amazonaws.com || echo '?')"
echo
echo "==> Deploy complete."
echo "    server: $(systemctl is-active $SERVICE_NAME)   nginx: $(systemctl is-active nginx)"
echo "    visit:  http://$IP/"
echo
echo "Useful commands:"
echo "  sudo systemctl restart $SERVICE_NAME          # restart the app"
echo "  journalctl -u $SERVICE_NAME -f                 # live logs"
echo "  sudo bash deploy/deploy.sh                     # re-deploy after a code push"
