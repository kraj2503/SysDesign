#!/usr/bin/env bash
# SysDesignLab — Production Diagnostic Script
# Run this ON THE ORACLE VM (not your Mac) to diagnose the restart loop
#
# Usage:
#   chmod +x diagnose.sh
#   ./diagnose.sh

set -euo pipefail

APP_DIR="/opt/sysdesignlab"
SERVER_DIR="$APP_DIR/server"
ENV_FILE="$APP_DIR/.env"

echo "=========================================="
echo "  SysDesignLab Production Diagnostics"
echo "  $(date)"
echo "=========================================="
echo

# 1. Service status
echo ">>> 1. Service Status"
systemctl status sysdesignlab --no-pager -l || true
echo

# 2. Recent logs (the actual error)
echo ">>> 2. Last 80 lines of service logs"
journalctl -u sysdesignlab -n 80 --no-pager || true
echo

# 3. Check .env exists and has required vars
echo ">>> 3. Environment File Check"
if [ -f "$ENV_FILE" ]; then
  echo "✓ $ENV_FILE exists"
  echo "--- Contents (secrets masked) ---"
  sed 's/SESSION_SECRET=.*/SESSION_SECRET=***/; s/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=***/' "$ENV_FILE"
else
  echo "✗ $ENV_FILE MISSING"
fi
echo

# 4. Check required env vars are set
echo ">>> 4. Required Environment Variables"
source "$ENV_FILE" 2>/dev/null || true
for var in NODE_ENV PORT SESSION_SECRET; do
  val="${!var:-}"
  if [ -n "$val" ]; then
    if [ "$var" = "SESSION_SECRET" ]; then
      echo "✓ $var is set (${#val} chars)"
    else
      echo "✓ $var=$val"
    fi
  else
    echo "✗ $var is NOT set"
  fi
done
echo

# 5. Test running the app manually (shows actual error)
echo ">>> 5. Manual App Test (runs for 5 seconds, then kills)"
cd "$SERVER_DIR"
timeout 5 sudo -u sysdesignlab NODE_ENV=production PORT=4000 node /opt/sysdesignlab/node_modules/.bin/tsx src/index.ts 2>&1 || true
echo

# 6. Check database
echo ">>> 6. Database Check"
DB_PATH="$SERVER_DIR/data/sysdesign.db"
if [ -f "$DB_PATH" ]; then
  echo "✓ Database exists: $DB_PATH"
  ls -lh "$DB_PATH"
  # Quick integrity check
  sudo -u sysdesignlab sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1 || true
else
  echo "✗ Database NOT found at $DB_PATH"
fi
echo

# 7. Check Node.js and dependencies
echo ">>> 7. Node.js / Dependencies"
echo "Node: $(node -v)"
echo "NPM:  $(npm -v)"
if [ -f "$SERVER_DIR/package.json" ]; then
  echo "Server package.json: ✓"
  if [ -d "$SERVER_DIR/node_modules" ]; then
    echo "node_modules: ✓"
  else
    echo "node_modules: ✗ (run npm install)"
  fi
else
  echo "Server package.json: ✗"
fi
echo

# 8. Check client build
echo ">>> 8. Client Build Check"
CLIENT_DIST="$SERVER_DIR/../client/dist"
if [ -d "$CLIENT_DIST" ]; then
  echo "✓ Client build exists: $CLIENT_DIST"
  ls -la "$CLIENT_DIST" | head -10
else
  echo "✗ Client build NOT found at $CLIENT_DIST"
  echo "Build it on your Mac (npm run build), then re-deploy: bash deploy/push.sh <PUBLIC_IP>"
fi
echo

# 9. Check ports
echo ">>> 9. Port 4000 Status"
ss -ltnp | grep :4000 || echo "Nothing listening on :4000"
echo

# 10. nginx status
echo ">>> 10. Nginx Status"
systemctl status nginx --no-pager -l || true
echo

echo "=========================================="
echo "  Diagnostics Complete"
echo "=========================================="
echo
echo "Next steps based on common issues:"
echo "  - If manual test (step 5) shows error → fix that error"
echo "  - If DB missing → run: cd $APP_DIR && sudo -u sysdesignlab npm run seed"
echo "  - If client build missing → build on your Mac (npm run build), then re-run: bash deploy/push.sh <PUBLIC_IP>"
echo "  - If .env missing SESSION_SECRET → generate: openssl rand -hex 32"
echo "  - If port 4000 not listening after manual test works → check systemd unit"