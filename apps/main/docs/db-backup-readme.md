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

## Test an archived backup

Use an existing S3 object for this test. The backup command above creates a
new remote dump; the restore command tests the stored archive.

1. Check the latest successful `Database Backup` workflow. Match its upload
   filename to an object in `daylily-catalog-db-backup`.
2. Download that object into a private directory under
   `apps/main/tests/.tmp/`. Verify the S3 checksum and the ZIP CRC.
3. Run `scripts/restore-backup.sh` with a new output database path. The script
   imports into the named database, so always use an empty destination.
4. Run these checks on the local restored file:

   ```sh
   sqlite3 -readonly path/to/restored.db 'PRAGMA integrity_check; PRAGMA foreign_key_check;'
   ```

   Expect `ok` from the integrity check and no rows from the foreign key check.
   Confirm that all expected tables and their rows were restored. Keep member
   records out of reports.
5. For an index change, copy the restored database and apply the exact tracked
   SQL to the copy in a transaction. Check integrity, index columns, and query
   plans. Compare table counts and data hashes before and after the change.
6. Save the workflow URL, S3 object key, checksums, and test results. Remove
   temporary dumps and databases after the test.

The scheduled workflow creates and uploads the archive. It does not run this
restore test. An archived-backup test also does not replace the fresh backup
required immediately before an approved production schema change.
