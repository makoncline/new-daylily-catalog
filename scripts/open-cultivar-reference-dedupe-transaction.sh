#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

MIGRATION_SQL="$REPO_ROOT/prisma/data-migrations/20260225_dedupe_cultivar_reference_normalized_name.sql"
VERIFY_SQL="$REPO_ROOT/prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql"
DEFAULT_DB="$REPO_ROOT/prisma/local-prod-copy-daylily-catalog.db"

DB_PATH="$DEFAULT_DB"

if [[ $# -gt 0 ]]; then
  case "$1" in
    --db)
      if [[ $# -lt 2 ]]; then
        echo "Usage: $0 [--db /absolute/or/relative/path/to/db.sqlite]"
        exit 1
      fi
      DB_PATH="$2"
      ;;
    *)
      echo "Usage: $0 [--db /absolute/or/relative/path/to/db.sqlite]"
      exit 1
      ;;
  esac
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database file not found: $DB_PATH"
  exit 1
fi

if [[ ! -f "$MIGRATION_SQL" ]]; then
  echo "Missing migration SQL file: $MIGRATION_SQL"
  exit 1
fi

if [[ ! -f "$VERIFY_SQL" ]]; then
  echo "Missing verification SQL file: $VERIFY_SQL"
  exit 1
fi

TMP_DIR="$REPO_ROOT/tests/.tmp"
mkdir -p "$TMP_DIR"
BODY_SQL="$TMP_DIR/20260225_dedupe_cultivar_reference_normalized_name.body.$(date +%s).sql"

awk '
  $0 ~ /^BEGIN TRANSACTION;$/ { next }
  $0 ~ /^COMMIT;$/ { next }
  { print }
' "$MIGRATION_SQL" > "$BODY_SQL"

echo "Opening transaction on: $DB_PATH"
echo "Running verification before and after migration in the same transaction."
echo "Run COMMIT; then .quit to persist."
echo "Run ROLLBACK; then .quit to discard."

sqlite3 -header -column "$DB_PATH" \
  -cmd ".bail on" \
  -cmd "PRAGMA foreign_keys = ON;" \
  -cmd "BEGIN IMMEDIATE;" \
  -cmd ".print ===== BEFORE MIGRATION =====" \
  -cmd ".read $VERIFY_SQL" \
  -cmd ".print ===== APPLYING MIGRATION BODY =====" \
  -cmd ".read $BODY_SQL" \
  -cmd ".print ===== AFTER MIGRATION =====" \
  -cmd ".read $VERIFY_SQL"
