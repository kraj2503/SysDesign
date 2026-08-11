```bash
#!/usr/bin/env bash

# SysDesignLab — Oracle Cloud Always Free deploy script.
#
# Runs on the VM as root (sudo).
# Safe to re-run after a code push.
#
# Normal workflow:
#   cd /home/ubuntu/SysDesign
#   git pull
#   sudo bash deploy/deploy.sh
#
# Ownership model:
#   - Git/source files: owned by the operator user (normally ubuntu)
#   - node_modules: owned by sysdesignlab
#   - server/data: owned by sysdesignlab
#   - .env: owned by sysdesignlab
#   - client/dist: owned by the operator when using the Mac-built version
#
# What it does:
# 1. Installs required system packages.
# 2. Installs Node.js 22 if necessary.
# 3. Creates the dedicated sysdesignlab application user.
# 4. Sets ownership only on runtime-writable directories.
# 5. Installs dependencies with npm ci.
# 6. Keeps npm cache outside the Git repository.
# 7. Uses the prebuilt client/dist from the Mac when available.
# 8. Builds client/dist on the server only as a fallback.
# 9. Creates .env on first deployment and preserves it afterward.
# 10. Creates/seeds SQLite only when the DB does not exist.
# 11. Installs/restarts the systemd service.
# 12. Configures nginx without overwriting an existing TLS configuration.

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$APP_DIR/server"
ENV_FILE="$APP_DIR/.env"

APP_USER="sysdesignlab"
SERVICE_NAME="sysdesignlab"

NPM_CACHE="/var/cache/$APP_USER/npm"

# ---------------------------------------------------------------------------
# 0. Require root
# ---------------------------------------------------------------------------

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo bash deploy/deploy.sh" >&2
    exit 1
fi

echo "==> SysDesignLab deploy"
echo "    app dir: $APP_DIR"

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------

export DEBIAN_FRONTEND=noninteractive

apt-get update -y

apt-get install -y \
    ca-certificates \
    curl \
    git \
    nginx \
    build-essential \
    python3 \
    pkg-config \
    openssl

# ---------------------------------------------------------------------------
# 2. Node.js
# ---------------------------------------------------------------------------

# Node >= 20.12 is required for process.loadEnvFile.
# Node 22 is preferred.

node_ok() {
    command -v node >/dev/null 2>&1 || return 1

    node -e '
        const [M,m] = process.versions.node.split(".").map(Number);
        process.exit(
            M > 20 || (M === 20 && m >= 12)
            ? 0
            : 1
        );
    ' 2>/dev/null
}

if ! node_ok; then
    echo "==> Installing Node.js 22 via NodeSource..."

    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

    apt-get install -y nodejs
fi

echo "==> node $(node -v) · npm $(npm -v)"

# ---------------------------------------------------------------------------
# 3. Dedicated application user
# ---------------------------------------------------------------------------

if ! id -u "$APP_USER" >/dev/null 2>&1; then
    echo "==> Creating application user: $APP_USER"

    useradd \
        --system \
        --home-dir "$APP_DIR" \
        --shell /usr/sbin/nologin \
        "$APP_USER"
fi

# ---------------------------------------------------------------------------
# 4. Runtime ownership
# ---------------------------------------------------------------------------

# IMPORTANT:
#
# Do NOT chown the entire repository.
#
# The repository is operated by ubuntu:
#
#   git pull
#   git status
#   git checkout
#   etc.
#
# Only directories that the application itself must write to are owned by
# sysdesignlab.

echo "==> Setting runtime directory ownership..."

# node_modules is created/managed by npm during deployment.
mkdir -p "$APP_DIR/node_modules"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/node_modules"

# SQLite database and other runtime data.
mkdir -p "$SERVER_DIR/data"
chown -R "$APP_USER:$APP_USER" "$SERVER_DIR/data"

# ---------------------------------------------------------------------------
# 5. npm cache outside the Git repository
# ---------------------------------------------------------------------------

# Do NOT allow npm to create:
#
#   /home/ubuntu/SysDesign/.npm
#   /home/ubuntu/SysDesign/.cache
#
# Keep npm's cache/logs in /var/cache instead.

mkdir -p "$NPM_CACHE"
chown -R "$APP_USER:$APP_USER" "/var/cache/$APP_USER"

# ---------------------------------------------------------------------------
# 6. Install dependencies
# ---------------------------------------------------------------------------

cd "$APP_DIR"

echo "==> Installing production dependencies from package-lock.json..."

# npm ci is intentional here.
#
# Unlike npm install, npm ci uses the existing package-lock.json and does not
# rewrite it. This prevents the deployment from changing tracked Git files.
#
# The command runs as sysdesignlab because node_modules must be writable by
# the application user.
#
# npm's cache is explicitly outside the Git repository.

sudo -u "$APP_USER" \
    env HOME="/var/lib/$APP_USER" \
    npm ci \
        --cache "$NPM_CACHE" \
        --no-audit \
        --no-fund

# ---------------------------------------------------------------------------
# 7. Client build
# ---------------------------------------------------------------------------

# Normally client/dist is built on the Mac and pushed to the server.
#
# If it exists, leave it untouched.
#
# If it doesn't exist, build it as a fallback using sysdesignlab.

if [ -f "$APP_DIR/client/dist/index.html" ]; then

    echo "==> Using prebuilt client/dist (built on your Mac)."

else

    echo "==> No client/dist found — building on the server (fallback)."

    mkdir -p "$APP_DIR/client/dist"

    chown -R "$APP_USER:$APP_USER" "$APP_DIR/client/dist"

    sudo -u "$APP_USER" \
        env HOME="/var/lib/$APP_USER" \
        npm run build

    # Return the build output to the repository/operator owner.
    #
    # The application only needs read access to the built static files.

    # Determine the normal owner of the repository.
    REPO_OWNER="$(stat -c '%U' "$APP_DIR")"
    REPO_GROUP="$(stat -c '%G' "$APP_DIR")"

    chown -R "$REPO_OWNER:$REPO_GROUP" "$APP_DIR/client/dist"

fi

# ---------------------------------------------------------------------------
# 8. .env
# ---------------------------------------------------------------------------

umask 077

if [ ! -f "$ENV_FILE" ]; then

    echo "==> Creating $ENV_FILE..."

    {
        echo "NODE_ENV=production"
        echo "PORT=4000"
        echo "SESSION_SECRET=$(openssl rand -hex 32)"
        echo
        echo "# Google OAuth — optional."
        echo "# Uncomment and fill these values to enable Sign in with Google."
        echo "# GOOGLE_CLIENT_ID="
        echo "# GOOGLE_CLIENT_SECRET="
        echo "# GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback"
    } > "$ENV_FILE"

    echo "==> Wrote $ENV_FILE with a fresh SESSION_SECRET."

else

    echo "==> Keeping existing $ENV_FILE."

    # A partially configured .env may contain:
    #
    #   SESSION_SECRET=
    #
    # Fill it automatically instead of allowing the application to fail.

    if ! grep -qE '^SESSION_SECRET=.+' "$ENV_FILE"; then

        NEW_SECRET="$(openssl rand -hex 32)"

        if grep -q '^SESSION_SECRET=' "$ENV_FILE"; then

            sed -i \
                "s/^SESSION_SECRET=.*/SESSION_SECRET=$NEW_SECRET/" \
                "$ENV_FILE"

        else

            echo "SESSION_SECRET=$NEW_SECRET" >> "$ENV_FILE"

        fi

        echo "==> Filled in missing/empty SESSION_SECRET."

    fi

fi

# .env contains secrets.
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------------------
# 9. SQLite database
# ---------------------------------------------------------------------------

if [ ! -f "$SERVER_DIR/data/sysdesign.db" ]; then

    echo "==> No DB yet — seeding database..."

    sudo -u "$APP_USER" \
        env HOME="/var/lib/$APP_USER" \
        npm run seed

else

    echo "==> DB exists — skipping seed (user data preserved)."

fi

# Make absolutely sure the runtime user owns the DB after seed.
chown -R "$APP_USER:$APP_USER" "$SERVER_DIR/data"

# ---------------------------------------------------------------------------
# 10. systemd service
# ---------------------------------------------------------------------------

echo "==> Installing systemd service..."

install \
    -m 644 \
    "$APP_DIR/deploy/sysdesignlab.service" \
    "/etc/systemd/system/$SERVICE_NAME.service"

systemctl daemon-reload

systemctl enable "$SERVICE_NAME" >/dev/null

if systemctl is-active --quiet "$SERVICE_NAME"; then

    echo "==> Restarting $SERVICE_NAME (new code)"

    systemctl restart "$SERVICE_NAME"

else

    echo "==> Starting $SERVICE_NAME"

    systemctl start "$SERVICE_NAME"

fi

# ---------------------------------------------------------------------------
# 11. nginx
# ---------------------------------------------------------------------------

# Preserve an HTTPS configuration generated by Certbot.
#
# If the existing nginx config already contains ssl_certificate, don't
# overwrite it with our plain HTTP configuration.

NGINX_SITE="/etc/nginx/sites-available/$SERVICE_NAME"

if [ -f "$NGINX_SITE" ] && grep -q "ssl_certificate" "$NGINX_SITE"; then

    echo "==> nginx config already has TLS (certbot) — leaving it untouched."

else

    echo "==> Installing nginx configuration..."

    install \
        -m 644 \
        "$APP_DIR/deploy/nginx.sysdesignlab" \
        "$NGINX_SITE"

fi

ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$SERVICE_NAME"

rm -f /etc/nginx/sites-enabled/default

nginx -t

systemctl enable --now nginx >/dev/null 2>&1 || true

systemctl reload nginx

# ---------------------------------------------------------------------------
# 12. Final report
# ---------------------------------------------------------------------------

IP="$(
    curl -4 -s --max-time 5 \
        http://checkip.amazonaws.com \
        || echo '?'
)"

echo
echo "==> Deploy complete."
echo "    server: $(systemctl is-active "$SERVICE_NAME")   nginx: $(systemctl is-active nginx)"
echo "    visit:  http://$IP/"
echo
echo "Useful commands:"
echo "  git pull"
echo "  sudo systemctl restart $SERVICE_NAME"
echo "  journalctl -u $SERVICE_NAME -f"
echo "  sudo bash deploy/deploy.sh"
```
