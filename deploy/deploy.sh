#!/usr/bin/env bash
# SysDesignLab — Oracle Cloud Always Free deploy script.
#
# Runs on the VM, as root (sudo). Idempotent: safe to re-run after a code push.
#   cd /opt/sysdesignlab && sudo bash deploy/deploy.sh
#
# What it does:
#   1. installs system packages (nginx, build tools, python3 for native modules)
#   2. installs Node.js 22 via NodeSource if missing or older than 20.12
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

# --- 2. Node.js (>= 20.12 for process.loadEnvFile; 22 preferred) -------------
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const [M,m]=process.versions.node.split(".").map(Number); process.exit(M>20||(M===20&&m>=12)?0:1)' 2>/dev/null
}
if ! node_ok; then
  echo "==> Installing Node.js 22 via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "==> node $(node -v) · npm $(npm -v)"

# --- 3. dedicated app user + ownership --------------------------------------
id -u "$APP_USER" &>/dev/null || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
# Scope ownership to the runtime-writable dirs only (all gitignored). Do NOT
# chown the whole repo: it's pulled with git as the operator user (e.g. ubuntu),
# and chowning .git/tracked files would break `git pull`.
#   node_modules + client/dist are written by npm as the app user during
#   install/build; server/data holds the SQLite DB. Everything else stays
#   operator-owned so `git pull` keeps working.
chown -R "$APP_USER:$APP_USER" "$APP_DIR/node_modules" 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR/client/dist" 2>/dev/null || true
mkdir -p "$SERVER_DIR/data"
chown -R "$APP_USER:$APP_USER" "$SERVER_DIR/data"

# --- 4. install + build as the app user --------------------------------------
cd "$APP_DIR"
sudo -u "$APP_USER" npm install --no-audit --no-fund
sudo -u "$APP_USER" npm run build

# --- 5. .env (idempotent) -----------------------------------------------------
umask 077
if [ ! -f "$ENV_FILE" ]; then
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
  echo "==> Wrote $ENV_FILE with a fresh SESSION_SECRET."
else
  echo "==> Keeping existing $ENV_FILE."
  # A half-configured .env (e.g. `cp .env.production .env`) has an EMPTY
  # SESSION_SECRET=, and the app refuses to start without one. Fill it in
  # rather than bricking the deploy with a startup crash.
  if ! grep -qE '^SESSION_SECRET=.+' "$ENV_FILE"; then
    NEW_SECRET="$(openssl rand -hex 32)"
    if grep -q '^SESSION_SECRET=' "$ENV_FILE"; then
      sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$NEW_SECRET/" "$ENV_FILE"
    else
      echo "SESSION_SECRET=$NEW_SECRET" >> "$ENV_FILE"
    fi
    echo "==> Filled in missing/empty SESSION_SECRET."
  fi
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

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
systemctl enable "$SERVICE_NAME" >/dev/null
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "==> Restarting $SERVICE_NAME (new code)"
  systemctl restart "$SERVICE_NAME"
else
  systemctl start "$SERVICE_NAME"
fi

# --- 8. nginx ------------------------------------------------------------------
# Preserve an HTTPS config that certbot set up (it edits this file to add 443 +
# cert paths). Only (re)install our plain-HTTP config while no TLS config exists,
# otherwise the next re-deploy would wipe certbot's work and kill HTTPS.
if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ] && grep -q "ssl_certificate" "/etc/nginx/sites-available/$SERVICE_NAME"; then
  echo "==> nginx config already has TLS (certbot) — leaving it untouched."
else
  install -m 644 "$APP_DIR/deploy/nginx.sysdesignlab" "/etc/nginx/sites-available/$SERVICE_NAME"
fi
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
