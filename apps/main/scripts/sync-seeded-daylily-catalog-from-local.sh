#!/usr/bin/env bash

set -euo pipefail

LOCAL_DB_PATH="./local/realistic-data/realistic-data.sqlite"
TURSO_DB_NAME="seeded-daylily-catalog"
TABLES=(
  _prisma_migrations
  V2AhsCultivar
  User
  AhsListing
  CultivarReference
  Listing
  List
  _ListToListing
  UserProfile
  KeyValue
  ImageAsset
  Image
)

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

expected_tables="$(printf '%s\n' "${TABLES[@]}" | LC_ALL=C sort)"
actual_tables="$(
  sqlite3 "$LOCAL_DB_PATH" \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
)"
if [ "$actual_tables" != "$expected_tables" ]; then
  echo "Error: update the dependency-ordered TABLES list for the current schema."
  exit 1
fi

(
  echo "PRAGMA foreign_keys=OFF;"
  sqlite3 "$LOCAL_DB_PATH" "SELECT 'DROP VIEW IF EXISTS \"' || REPLACE(name, '\"', '\"\"') || '\";' FROM sqlite_master WHERE type='view';"
  for ((index=${#TABLES[@]} - 1; index >= 0; index--)); do
    echo "DROP TABLE IF EXISTS \"${TABLES[$index]}\";"
  done
  sqlite3 "$LOCAL_DB_PATH" ".schema --nosys"
  echo "BEGIN TRANSACTION;"
  for table_name in "${TABLES[@]}"; do
    sqlite3 "$LOCAL_DB_PATH" ".dump --data-only \"$table_name\""
  done
  echo "COMMIT;"
) | turso db shell "$TURSO_DB_NAME"

verification_sql="SELECT CASE WHEN 1 = 1"
for table_name in "${TABLES[@]}"; do
  expected_count="$(
    sqlite3 "$LOCAL_DB_PATH" "SELECT COUNT(*) FROM \"$table_name\";"
  )"
  verification_sql+=" AND (SELECT COUNT(*) FROM \"$table_name\") = $expected_count"
done
verification_sql+=" THEN 'seed-sync-counts-ok' ELSE 'seed-sync-counts-mismatch' END AS verification;"
verification_output="$(
  turso db shell "$TURSO_DB_NAME" "$verification_sql"
)"
echo "$verification_output"
if [[ "$verification_output" != *"seed-sync-counts-ok"* ]]; then
  echo "Error: seeded database table counts do not match the local snapshot."
  exit 1
fi

echo "Synced $LOCAL_DB_PATH into Turso database $TURSO_DB_NAME"
