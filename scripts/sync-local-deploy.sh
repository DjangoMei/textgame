#!/bin/sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DEPLOY_ROOT="${TEXTGAME_DEPLOY_ROOT:-/Users/djangomei/textgame-service}"

mkdir -p "$DEPLOY_ROOT"
rsync -a --delete \
  --exclude .git \
  --exclude .env \
  --exclude data \
  --exclude dist \
  --exclude node_modules \
  --exclude .cache \
  "$PROJECT_ROOT/" "$DEPLOY_ROOT/"

chmod +x "$DEPLOY_ROOT/scripts/run-production.sh"

echo "Synced textgame service to $DEPLOY_ROOT"
