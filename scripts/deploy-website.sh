#!/usr/bin/env bash

set -euo pipefail

# ─── Remote server config ─────────────────────────────────────────────────────
SERVER_USER="alp"
SERVER_HOST="82.165.144.139"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
# ─────────────────────────────────────────────────────────────────────────────

APP_ROOT="${APP_ROOT:-/var/www/daylog}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-daylog-website}"

# If this script is NOT running on the server, SSH in and re-run it there.
if [[ "${DEPLOY_REMOTE:-1}" == "1" ]] && ! command -v pm2 >/dev/null 2>&1; then
  echo "→ Connecting to $SERVER_USER@$SERVER_HOST and running deploy..."
  ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $APP_ROOT && bash scripts/deploy-website.sh"
  exit $?
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required on the server"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required on the server"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required on the server"
  exit 1
fi

cd "$APP_ROOT"

# Configure sparse checkout so the server only pulls website/data/scripts/deploy.
# The mobile app/ directory is excluded — it is not needed on the server.
if [ "$(git config core.sparseCheckout)" != "true" ]; then
  echo "Configuring sparse checkout (first-time setup)..."
  git config core.sparseCheckout true
  mkdir -p .git/info
  cat > .git/info/sparse-checkout << 'EOF'
website/
data/
scripts/
deploy/
package.json
package-lock.json
.gitignore
.github/
EOF
  echo "Sparse checkout configured: app/ will not be fetched."
fi

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci --include=dev --prefix data
npm install --include=dev --legacy-peer-deps --prefix website

# Source env files after install so NODE_ENV from env files does not omit build-time dev dependencies.
set -a
[ -f "$APP_ROOT/website/.env.local" ] && source "$APP_ROOT/website/.env.local"
[ -f "$APP_ROOT/data/.env.local" ] && source "$APP_ROOT/data/.env.local"
set +a

npm --prefix data run db:migrate:deploy
npm --prefix website run build

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 reload website/ecosystem.config.cjs --only "$PM2_APP_NAME" --update-env
else
  pm2 start website/ecosystem.config.cjs --only "$PM2_APP_NAME" --update-env
fi

pm2 save

echo "Deployment completed"