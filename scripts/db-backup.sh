#!/bin/bash

# Secrets will be provided through environment variables
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# TURSO_API_TOKEN
# CI

# Variables
DATABASE_NAME="daylily-catalog"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${DATABASE_NAME}_${TIMESTAMP}.sql"
ZIP_FILE="${DUMP_FILE}.zip"
LOCAL_DB="prisma/local-prod-copy-${DATABASE_NAME}.db"
S3_BUCKET="daylily-catalog-db-backup"
AWS_REGION="us-east-1"

# Exit on any error
set -e

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

# Step 2: Compress the dump file
echo "Compressing the dump file..."
zip "$ZIP_FILE" "$DUMP_FILE"
if [ $? -ne 0 ]; then
  echo "Error: Failed to compress the dump file."
  rm "$DUMP_FILE"
  exit 1
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
  
  # Decompress the dump file
  unzip "$ZIP_FILE"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to decompress the dump file."
    rm "$DUMP_FILE" "$ZIP_FILE"
    exit 1
  fi

  # Create a local SQLite database from the dump
  cat "$DUMP_FILE" | sqlite3 "$LOCAL_DB"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to create local SQLite database."
    rm "$DUMP_FILE" "$ZIP_FILE" "$LOCAL_DB"
    exit 1
  fi

  echo "Local verification completed successfully."
fi

# Cleanup
echo "Cleaning up..."
rm "$DUMP_FILE" "$ZIP_FILE"

echo "Backup process completed successfully."
