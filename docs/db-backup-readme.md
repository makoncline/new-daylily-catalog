# Database Backup System

This repository includes automated database backup scripts and GitHub Actions workflows to regularly backup the Turso database to AWS S3.

## Setup Instructions

### GitHub Secrets

To enable automated backups, add the following secrets to your GitHub repository:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key with S3 write permissions
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
   - `TURSO_API_TOKEN`: Your Turso API token for database access

### AWS S3 Bucket

Ensure you have an S3 bucket named `daylily-catalog-db-backup` in the `us-east-1` region, or update the bucket name and region in the script.

## Backup Process

- The GitHub Actions workflow runs automatically every day at 02:00 UTC
- You can also trigger a manual backup by running the workflow from the Actions tab
- The backup script:
  1. Creates a database dump from Turso
  2. Compresses the dump file
  3. Uploads the compressed file to S3
  4. Cleans up temporary files

## Restore Process

To restore a backup:

```bash
# Download the backup file from S3 (if needed) or manually
aws s3 cp s3://daylily-catalog-db-backup/BACKUP_FILENAME.sql.zip ./

# Run the restore script
./scripts/restore-backup.sh -z BACKUP_FILENAME.sql.zip -o path/to/output/database.db
```

## Local Testing

To test the backup script locally:

```bash
# Set required environment variables
export TURSO_API_TOKEN="your_turso_api_token"
export AWS_ACCESS_KEY_ID="your_aws_access_key"
export AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
export CI="false"  # Set to true to upload to S3, false for local verification only

# Run the backup script using the development environment variables
pnpm env:dev bash scripts/db-backup.sh
# start the dev server pointing to the local-prod-copy-daylily-catalog.db database
LOCAL_DATABASE_URL="file:./local-prod-copy-daylily-catalog.db" pnpm dev
```

If `CI` is set to `false`, the script will verify the backup by creating a local copy of the database at `prisma/local-prod-copy-daylily-catalog.db` which you can use for testing.
