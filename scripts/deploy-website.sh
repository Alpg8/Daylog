#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/daylog}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-daylog-website}"

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

npm ci --prefix data
npm ci --prefix website

# Source env files for migration
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