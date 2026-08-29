#!/bin/sh
set -eu
cd /workspace

if curl -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
  exit 0
fi

export PORT="${PORT:-8080}"
export NODE_ENV="${NODE_ENV:-development}"

if [ ! -d node_modules/express ] || [ ! -d node_modules/mongoose ]; then
  npm install --no-audit --no-fund
fi

nohup node src/server.js >/tmp/gfbf-server.log 2>&1 &
pid=$!

i=0
while [ "$i" -lt 40 ]; do
  if curl -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    exit 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "GF BF server exited early:" >&2
    tail -n 40 /tmp/gfbf-server.log >&2 || true
    exit 1
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "GF BF server did not become healthy:" >&2
tail -n 40 /tmp/gfbf-server.log >&2 || true
exit 1
