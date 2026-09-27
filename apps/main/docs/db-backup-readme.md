# Database Backup and Local Snapshot

`.github/workflows/db-backup.yml` runs at 02:00 UTC each day and can be started
manually. Its `ops` environment needs `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `TURSO_API_TOKEN`. It uploads SQL zip files to the
`daylily-catalog-db-backup` S3 bucket in `us-east-1`.

To create a verified local production copy, run from the repository root:

```sh
CI=false pnpm env:dev bash scripts/db-backup.sh
```

The default destination is
`apps/main/prisma/local-prod-copy-daylily-catalog.db` in the primary checkout.
The script restores into a temporary file and replaces the copy after it
succeeds. It does not change production data.

## Linked worktrees

The backup command still writes to the primary checkout. When a procedure
needs the full snapshot in a linked worktree, copy it explicitly:

```sh
PRIMARY_CHECKOUT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
CURRENT_CHECKOUT="$(git rev-parse --show-toplevel)"
cp "$PRIMARY_CHECKOUT/apps/main/prisma/local-prod-copy-daylily-catalog.db" \
  "$CURRENT_CHECKOUT/apps/main/prisma/local-prod-copy-daylily-catalog.db"
```

## Restore an archived backup locally

```sh
aws s3 cp s3://daylily-catalog-db-backup/BACKUP_FILENAME.sql.zip ./
cd apps/main
bash scripts/restore-backup.sh -z ../../BACKUP_FILENAME.sql.zip -o path/to/output/database.db
```

Inspect the restored database before any separate production recovery action.
