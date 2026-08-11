#!/usr/bin/env bash
# SysDesignLab — build the client on the Mac, ship the prebuilt client/dist to the
# VM, then run the server-side deploy. Run from anywhere; one command end-to-end.
#
# Usage:
#   bash deploy/push.sh <PUBLIC_IP> [--no-build]
#
#   --no-build   skip the local `npm run build` (use the existing client/dist)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/sysdesignlab}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
HOST="${1:?usage: bash deploy/push.sh <PUBLIC_IP> [--no-build]}"
APP_DIR="/opt/sysdesignlab"
BUILD=1
[ "${2:-}" = "--no-build" ] && BUILD=0

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1. Build the client locally (tsc --noEmit + vite build).
if [ "$BUILD" -eq 1 ]; then
  echo "==> Building client locally (tsc --noEmit + vite build)…"
  npm run build
fi

# 2. Guard: never ship a deploy without a dist (rsync --delete would otherwise
#    wipe the server's good dist before we could complain).
[ -f "client/dist/index.html" ] || {
  echo "ERROR: client/dist/index.html missing — run 'npm run build' first." >&2
  exit 1
}

# 3. Prepare the VM: ensure the target dir exists and is operator-owned, and
#    migrate any leftover app-user-owned dist from older server-side builds so
#    `rsync --delete` can unlink stale hashed assets. (The `[ ! -e ] ||` guard
#    tolerates a first deploy where client/dist doesn't exist yet.)
echo "==> Preparing $HOST:$APP_DIR…"
ssh -i "$SSH_KEY" "$REMOTE_USER@$HOST" \
  "sudo mkdir -p $APP_DIR && sudo chown $REMOTE_USER:$REMOTE_USER $APP_DIR; [ ! -e $APP_DIR/client/dist ] || sudo chown -R $REMOTE_USER:$REMOTE_USER $APP_DIR/client/dist"

# 4. Sync the repo — now INCLUDING the prebuilt client/dist. --delete sweeps stale
#    hashed assets from prior builds.
echo "==> Syncing repo (including prebuilt client/dist)…"
rsync -avz --delete \
  --exclude node_modules --exclude .git \
  --exclude server/data --exclude .env \
  -e "ssh -i $SSH_KEY" \
  ./ "$REMOTE_USER@$HOST:$APP_DIR/"

# 5. Run the server-side deploy (installs deps, uses the prebuilt dist, keeps .env
#    and server/data).
echo "==> Running deploy.sh on the VM…"
ssh -i "$SSH_KEY" "$REMOTE_USER@$HOST" "sudo bash $APP_DIR/deploy/deploy.sh"
echo "==> Deploy complete."
