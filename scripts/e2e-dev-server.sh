#!/bin/bash
# E2E dev server wrapper - provisions and clears DB before starting server
# This guarantees DB is ready and empty before the server starts

set -e

# Provision DB from template if LOCAL_DATABASE_URL points to tests/.tmp
if [[ "$LOCAL_DATABASE_URL" == file:*tests/.tmp* ]]; then
  DB_PATH="${LOCAL_DATABASE_URL#file:}"
  TEMPLATE_PATH="prisma/db-dev.sqlite"
  
  if [[ -f "$TEMPLATE_PATH" ]]; then
    mkdir -p "$(dirname "$DB_PATH")"
    cp "$TEMPLATE_PATH" "$DB_PATH"
    echo "[e2e] Copied template DB to $DB_PATH"
    
    # Clear all data from the DB (keep schema)
    sqlite3 "$DB_PATH" <<'SQL'
DELETE FROM "Image";
DELETE FROM "_ListToListing";
DELETE FROM "List";
DELETE FROM "Listing";
DELETE FROM "UserProfile";
DELETE FROM "AhsListing";
DELETE FROM "KeyValue";
DELETE FROM "User";
SQL
    echo "[e2e] Cleared DB data"
  else
    echo "[e2e] Warning: Template DB not found at $TEMPLATE_PATH"
    exit 1
  fi
fi

# Start the dev server
exec npm run dev
