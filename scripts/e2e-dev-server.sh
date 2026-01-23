#!/bin/bash
# E2E dev server wrapper - provisions and clears DB before starting server
# This guarantees DB is ready and empty before the server starts

set -e

# Get script directory and project root (assuming script is in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root to ensure relative paths work
cd "$PROJECT_ROOT"

echo "[e2e-dev-server] Starting with LOCAL_DATABASE_URL=$LOCAL_DATABASE_URL"
echo "[e2e-dev-server] Project root: $PROJECT_ROOT"
echo "[e2e-dev-server] Current directory: $(pwd)"

# Provision DB from template if LOCAL_DATABASE_URL points to tests/.tmp
if [[ "$LOCAL_DATABASE_URL" == file:*tests/.tmp* ]]; then
  DB_PATH="${LOCAL_DATABASE_URL#file:}"
  # Resolve to absolute path if relative
  if [[ "$DB_PATH" != /* ]]; then
    DB_PATH="$PROJECT_ROOT/$DB_PATH"
  fi
  TEMPLATE_PATH="$PROJECT_ROOT/prisma/db-dev.sqlite"
  
  echo "[e2e-dev-server] Detected temp DB path: $DB_PATH"
  echo "[e2e-dev-server] Template path: $TEMPLATE_PATH"
  
  if [[ -f "$TEMPLATE_PATH" ]]; then
    echo "[e2e-dev-server] Template DB found, copying..."
    mkdir -p "$(dirname "$DB_PATH")"
    cp "$TEMPLATE_PATH" "$DB_PATH"
    echo "[e2e-dev-server] Copied template DB to $DB_PATH"
    
    # Clear all data from the DB (keep schema)
    echo "[e2e-dev-server] Clearing DB data..."
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
    echo "[e2e-dev-server] Cleared DB data"
  else
    echo "[e2e-dev-server] ERROR: Template DB not found at $TEMPLATE_PATH"
    echo "[e2e-dev-server] Current directory: $(pwd)"
    echo "[e2e-dev-server] Files in prisma/: $(ls -la prisma/ 2>&1 || echo 'prisma/ does not exist')"
    exit 1
  fi
else
  echo "[e2e-dev-server] LOCAL_DATABASE_URL does not match tests/.tmp pattern, skipping DB provisioning"
fi

# Start the dev server
echo "[e2e-dev-server] Starting dev server..."
exec npm run dev
