#!/bin/zsh
set -euo pipefail

SESSION_NAME="chatgpt-ai"
PORT_FILE="$HOME/Library/Application Support/Google/Chrome/DevToolsActivePort"

if [[ "$#" -eq 0 ]]; then
  exec agent-browser \
    --session "$SESSION_NAME" \
    --allowed-domains chatgpt.com \
    get url
fi

if [[ "$1" == "connect" ]]; then
  if [[ ! -f "$PORT_FILE" ]]; then
    echo "Chrome DevToolsActivePort file not found at: $PORT_FILE" >&2
    echo "Open your headed Chrome ai profile and enable remote debugging first." >&2
    exit 1
  fi

  PORT="$(head -n 1 "$PORT_FILE" | tr -d '\r\n')"

  if [[ -z "$PORT" ]]; then
    echo "Could not read a Chrome CDP port from: $PORT_FILE" >&2
    exit 1
  fi

  exec agent-browser \
    --session "$SESSION_NAME" \
    connect "$PORT"
fi

exec agent-browser \
  --session "$SESSION_NAME" \
  --allowed-domains chatgpt.com \
  "$@"
