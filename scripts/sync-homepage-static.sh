#!/bin/sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
HOMEPAGE_ROOT="${HOMEPAGE_ROOT:-/Users/djangomei/Documents/个人主页}"
TARGET_DIR="$HOMEPAGE_ROOT/textgame"
API_BASE_URL="${TEXTGAME_API_BASE_URL:-https://api.djangomei.com}"

mkdir -p "$TARGET_DIR"

rsync -a --delete \
  "$PROJECT_ROOT/index.html" \
  "$TARGET_DIR/index.html"

rsync -a --delete "$PROJECT_ROOT/src/" "$TARGET_DIR/src/"
rsync -a --delete "$PROJECT_ROOT/assets/" "$TARGET_DIR/assets/"
rsync -a --delete "$PROJECT_ROOT/prompts/" "$TARGET_DIR/prompts/"
rsync -a --delete "$PROJECT_ROOT/config/" "$TARGET_DIR/config/"

cat > "$TARGET_DIR/src/config.js" <<EOF
window.ENDLESS_STORY_CONFIG = {
  llmProxyUrl: "$API_BASE_URL"
};
EOF

echo "Synced textgame static files to $TARGET_DIR"
