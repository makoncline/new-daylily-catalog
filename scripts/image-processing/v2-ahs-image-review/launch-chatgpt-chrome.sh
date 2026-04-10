#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RUNTIME_DIR="$REPO_ROOT/local/v2-ahs-image-review"
USER_DATA_DIR="$RUNTIME_DIR/chrome-user-data"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROJECT_URL="${1:-https://chatgpt.com/g/g-p-699f1be0ab188191b6684cd2d8da6013-daylily-images/project}"

mkdir -p "$RUNTIME_DIR" "$USER_DATA_DIR"

exec "$CHROME_BIN" \
  --user-data-dir="$USER_DATA_DIR" \
  --remote-debugging-port=0 \
  --no-first-run \
  --no-default-browser-check \
  --new-window \
  "$PROJECT_URL"
