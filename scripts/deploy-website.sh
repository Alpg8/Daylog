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

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci --prefix data
npm ci --prefix website

npm --prefix data run db:migrate:deploy
npm --prefix website run build

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 reload website/ecosystem.config.cjs --only "$PM2_APP_NAME" --update-env
else
  pm2 start website/ecosystem.config.cjs --only "$PM2_APP_NAME" --update-env
fi

pm2 save

echo "Deployment completed"