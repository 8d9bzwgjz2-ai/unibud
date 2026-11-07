#!/bin/sh
# Base44 sandbox startup for the UNIBUD dev server.
#
# node_modules lives in a Docker volume (see docker-compose.base44.yml), so it is
# empty on a fresh volume. Install from the committed lockfile only when the
# lockfile changed since the last install, then let the caller exec `npm run dev`
# (the env wrapper that supplies .grok/app-env.json).
set -eu

cd "$(dirname "$0")/.."

STAMP=node_modules/.base44-lock
CURRENT=$(node -e "const {createHash}=require('node:crypto');const {readFileSync}=require('node:fs');process.stdout.write(createHash('sha1').update(readFileSync('package-lock.json')).digest('hex'))")

if [ ! -d node_modules/vite ] || [ "$(cat "$STAMP" 2>/dev/null || true)" != "$CURRENT" ]; then
  echo "[base44] installing dependencies from package-lock.json"
  npm ci --no-audit --no-fund
  mkdir -p node_modules
  printf '%s' "$CURRENT" > "$STAMP"
else
  echo "[base44] dependencies already in sync with package-lock.json"
fi
