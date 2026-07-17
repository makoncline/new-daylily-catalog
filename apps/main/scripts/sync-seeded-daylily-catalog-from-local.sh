#!/usr/bin/env bash

set -euo pipefail

LOCAL_DB_PATH="./local/realistic-data/realistic-data.sqlite"
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
  node scripts/sqlite-replace-statements.mjs "$LOCAL_DB_PATH"
  node scripts/sqlite-replace-statements.mjs --schema "$LOCAL_DB_PATH"
  echo "BEGIN TRANSACTION;"
  while IFS= read -r table_name; do
    sqlite3 "$LOCAL_DB_PATH" ".dump --data-only \"$table_name\""
  done < <(
    node scripts/sqlite-replace-statements.mjs --load-order "$LOCAL_DB_PATH"
  )
  echo "COMMIT;"
) | turso db shell "$TURSO_DB_NAME"

verification_sql="$(
  node scripts/sqlite-replace-statements.mjs --verify-counts "$LOCAL_DB_PATH"
)"
verification_output="$(
  turso db shell "$TURSO_DB_NAME" "$verification_sql"
)"
echo "$verification_output"
if [[ "$verification_output" != *"seed-sync-counts-ok"* ]]; then
  echo "Error: seeded database table counts do not match the local snapshot."
  exit 1
fi

echo "Synced $LOCAL_DB_PATH into Turso database $TURSO_DB_NAME"
