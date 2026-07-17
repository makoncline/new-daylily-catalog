#!/bin/bash

# Secrets will be provided through environment variables
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# TURSO_API_TOKEN
# CI

# Exit on any error
set -e

# Variables
DATABASE_NAME="${TURSO_SNAPSHOT_DB_NAME:-daylily-catalog}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${DATABASE_NAME}_${TIMESTAMP}.sql"
ZIP_FILE="${DUMP_FILE}.zip"
LOCAL_DB="${TURSO_SNAPSHOT_OUTPUT_DB_PATH:-}"
S3_BUCKET="daylily-catalog-db-backup"
AWS_REGION="us-east-1"

if [ "$CI" != "true" ] && [ -z "$LOCAL_DB" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  GIT_COMMON_DIR="$(git -C "$SCRIPT_DIR" rev-parse --path-format=absolute --git-common-dir)"
  PRIMARY_REPO_ROOT="$(dirname "$GIT_COMMON_DIR")"
  LOCAL_DB="$PRIMARY_REPO_ROOT/apps/main/prisma/local-prod-copy-${DATABASE_NAME}.db"
fi

# Ensure TURSO_API_TOKEN is set
if [ -z "$TURSO_API_TOKEN" ]; then
  echo "Error: TURSO_API_TOKEN is not set."
  exit 1
fi

# Step 1: Create a database dump using the provided token
echo "Creating database dump..."
# Using the working pattern for authentication
TURSO_API_TOKEN="$TURSO_API_TOKEN" turso db shell "$DATABASE_NAME" .dump > "$DUMP_FILE"

# Check the dump file for authentication errors
if head -n 3 "$DUMP_FILE" | grep -qi "You are not logged in"; then
  echo "Error: Dump file indicates authentication failure."
  exit 1
fi

# Step 2: Compress the dump file (only needed for CI uploads)
ZIP_CREATED="false"
if [ "$CI" = "true" ]; then
  if ! command -v zip >/dev/null 2>&1; then
    echo "Error: zip is required when CI=true (upload step)."
    rm "$DUMP_FILE"
    exit 1
  fi

  echo "Compressing the dump file..."
  zip "$ZIP_FILE" "$DUMP_FILE"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to compress the dump file."
    rm "$DUMP_FILE"
    exit 1
  fi

  ZIP_CREATED="true"
fi

# Step 3: Upload the compressed file to S3 (only in CI/CD environment)
if [ "$CI" = "true" ]; then
  echo "Uploading the compressed file to S3..."
  aws s3 cp "$ZIP_FILE" "s3://$S3_BUCKET/$ZIP_FILE"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to upload the file to S3."
    rm "$DUMP_FILE" "$ZIP_FILE"
    exit 1
  fi
fi

# Step 4: Verify the backup locally (only in local environment)
if [ "$CI" != "true" ]; then
  echo "Verifying the backup locally..."
  echo "Restoring the production snapshot to $LOCAL_DB"

  TEMP_LOCAL_DB="${LOCAL_DB}.tmp-${TIMESTAMP}-$$"
  LOCAL_DB_BACKUP="${LOCAL_DB}.bak-${TIMESTAMP}-$$"
  LOCAL_DB_LOCK="${LOCAL_DB}.refresh.lock"
  LOCAL_DB_LOCK_ACQUIRED="false"

  mkdir -p "$(dirname "$LOCAL_DB")"

  cleanup_local_temp() {
    rm -f "$TEMP_LOCAL_DB" "${TEMP_LOCAL_DB}-wal" "${TEMP_LOCAL_DB}-shm"
    if [ "$LOCAL_DB_LOCK_ACQUIRED" = "true" ]; then
      rmdir "$LOCAL_DB_LOCK"
    fi
  }

  trap cleanup_local_temp EXIT

  SQL_FILE="$DUMP_FILE"

  # Build the restored DB as a temp file first to avoid partial writes on failure.
  sqlite3 "$TEMP_LOCAL_DB" < "$SQL_FILE"

  LOCK_ATTEMPT=0
  until mkdir "$LOCAL_DB_LOCK" 2>/dev/null; do
    LOCK_ATTEMPT=$((LOCK_ATTEMPT + 1))
    if [ "$LOCK_ATTEMPT" -ge 300 ]; then
      echo "Error: Timed out waiting to replace $LOCAL_DB."
      exit 1
    fi
    sleep 0.1
  done
  LOCAL_DB_LOCK_ACQUIRED="true"

  if [ -f "$LOCAL_DB" ]; then
    mv "$LOCAL_DB" "$LOCAL_DB_BACKUP"
    if [ -f "${LOCAL_DB}-wal" ]; then
      mv "${LOCAL_DB}-wal" "${LOCAL_DB_BACKUP}-wal"
    fi
    if [ -f "${LOCAL_DB}-shm" ]; then
      mv "${LOCAL_DB}-shm" "${LOCAL_DB_BACKUP}-shm"
    fi
    echo "Existing local DB moved to $LOCAL_DB_BACKUP"
  fi

  mv "$TEMP_LOCAL_DB" "$LOCAL_DB"
  rmdir "$LOCAL_DB_LOCK"
  LOCAL_DB_LOCK_ACQUIRED="false"
  trap - EXIT
  cleanup_local_temp

  echo "Local verification completed successfully."
fi

# Cleanup
echo "Cleaning up..."
rm "$DUMP_FILE"
if [ "$ZIP_CREATED" = "true" ]; then
  rm "$ZIP_FILE"
fi

echo "Backup process completed successfully."
