#!/usr/bin/env bash

set -euo pipefail

LOCAL_DB_PATH="./prisma/local-dev.sqlite"
TURSO_DB_NAME="seeded-daylily-catalog"

if ! command -v turso >/dev/null 2>&1; then
  echo "Error: turso CLI is required."
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "Error: sqlite3 is required."
  exit 1
fi

if [ ! -f "$LOCAL_DB_PATH" ]; then
  echo "Error: local DB not found at $LOCAL_DB_PATH"
  exit 1
fi

(
  echo "PRAGMA foreign_keys=OFF;"
  sqlite3 "$LOCAL_DB_PATH" "SELECT 'DROP VIEW IF EXISTS \"' || REPLACE(name, '\"', '\"\"') || '\";' FROM sqlite_master WHERE type='view';"
  sqlite3 "$LOCAL_DB_PATH" "SELECT 'DROP TABLE IF EXISTS \"' || REPLACE(name, '\"', '\"\"') || '\";' FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  sqlite3 "$LOCAL_DB_PATH" ".dump"
) | turso db shell "$TURSO_DB_NAME"

echo "Synced $LOCAL_DB_PATH into Turso database $TURSO_DB_NAME"
