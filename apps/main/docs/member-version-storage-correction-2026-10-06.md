# Member version storage correction

## Cause

The production reviewer profile reads as `2026-03-02T22:28:08.430Z`, but its
stored `updatedAt` is ISO text. The app's SQLite and libSQL adapters write
integer milliseconds. A versioned update compares that integer with the text
value and returns a conflict. Fresh reads cannot resolve the conflict.

The local production copy also contains text versions in `Listing` and `List`.
These records use the same equality check. Normalize the stored versions once.
Do not add format fallbacks to normal member requests.

## Change

Generate the deterministic SQL from the repository root:

```sh
pnpm main exec node scripts/generate-member-version-storage-sql.mjs
```

The artifact is
`prisma/data-migrations/20261006_normalize_member_version_storage.sql` under
`apps/main`. It changes only text `updatedAt` values in `UserProfile`, `Listing`,
and `List`. It keeps the same date, including milliseconds and the UTC offset.
It does not change schema, ownership, content, membership, or photos. Integer
versions stay unchanged. Repeating the SQL makes no further changes.

The SQL checks all three tables before the first update. It rejects invalid
calendar dates such as February 29 in a non-leap year. It checks the local date
before applying the UTC offset. Use a client that stops on the first SQL error. For SQLite,
use `sqlite3 -bail`. Roll back and stop if any statement fails.

## Verification and apply

Follow [database migration steps](db-migration.md). Use the exact generated SQL.
Take and restore a fresh backup before production apply. Rehearse in a separate
local database. Compare every affected row before and after. All fields other
than the storage type of `updatedAt` must remain equal. Compare the date of
each converted value and verify that a repeat makes no changes.

The focused integration test reproduces the rejected profile edit before the
correction. After apply, profile, listing, and list edits succeed. Stale edits
still fail. A second case verifies that an invalid date stops the correction.

```sh
pnpm verify --tests tests/member-version-storage.integration.test.ts tests/member-versioning.integration.test.ts
```

After production apply, retry the hosted profile edit and check the ordinary
dashboard. Check the live public and member MCP contracts. Preserve the backup;
do not restore all user data to undo an application release.

This correction adds no database reads to normal requests. It needs one-time
table validation and updates during apply. The replica will receive the
corrected storage values through its normal sync.
