#!/bin/sh
set -eu
cd /workspace
export JWT_SECRET="${JWT_SECRET:-preview-jwt-secret-do-not-use-in-prod}"
export SESSION_SECRET="${SESSION_SECRET:-preview-session-secret-do-not-use-in-prod}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@gfbf.app}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin12345}"
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
