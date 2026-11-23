#!/usr/bin/env bash
# Deploys the latest main branch on the EC2 server.
# Run by Jenkins as ec2-user:  sudo -u ec2-user /home/ec2-user/expense-tracker/scripts/deploy.sh
set -euo pipefail

APP_DIR="/home/ec2-user/expense-tracker"
APP_NAME="expense-tracker"
BRANCH="main"

export HOME="/home/ec2-user"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$APP_DIR"

echo "==> Fetching $BRANCH"
git fetch --prune origin "$BRANCH"
# .env and logs/ are gitignored, so this leaves them alone.
git reset --hard "origin/$BRANCH"
echo "    now at $(git log -1 --format='%h %s')"

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Building frontend"
npm run build

echo "==> Running database migrations"
npm run migrate

echo "==> Reloading app with PM2"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start index.js --name "$APP_NAME"
fi
pm2 save

echo "==> Health check"
for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)
  if [ "$code" = "302" ] || [ "$code" = "200" ]; then
    echo "    app is up (HTTP $code)"
    exit 0
  fi
  sleep 2
done

echo "    app did not respond after deploy; last 40 log lines:"
pm2 logs "$APP_NAME" --lines 40 --nostream || true
exit 1
