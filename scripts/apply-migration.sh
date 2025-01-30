#!/bin/bash

# Ensure a migration name is provided
if [ -z "$1" ]; then
  echo "Error: Migration name is required."
  exit 1
fi

MIGRATION_NAME="$1"

# Apply the migration using Turso
turso db shell $TURSO_DATABASE_NAME < "prisma/migrations/$MIGRATION_NAME/migration.sql"