---
name: v2-ahs-refresh
description: Refresh daylilies.org V2 cultivar data in this repo. Use when fetching a fresh page snapshot, combining it into cultivars.db, generating delta SQL against the local prod copy, rehearsing locally, and only then applying to Turso if explicitly asked.
---

# V2 AHS Refresh

Use this workflow for ongoing `V2AhsCultivar` refreshes.

Default stance:
- use the local prod copy for analysis and rehearsal
- do not touch Turso unless the user explicitly asks
- review generated SQL before applying it anywhere

## Inputs

- live source: `https://daylilies.org/search/` + `https://daylilies.org/wp-admin/admin-ajax.php`
- local prod copy: `apps/main/prisma/local-prod-copy-daylily-catalog.db`
- fresh scrape output DB: `apps/main/cultivars.db`
- delta artifact dir: `apps/main/prisma/data-migrations/v2-ahs-cultivar-delta/`

## Fetch

Run from `apps/main/scripts/scrape` or use absolute paths. `TEMP_DIR` and `DB_FILE` are resolved from the current shell cwd, not the script file location.

```bash
cd apps/main/scripts/scrape
TEMP_DIR=../../temp_pages_new ./fetch-pages.sh
```

What to check:
- page 1 fetch succeeds and prints a nonce
- the script prints `Start total_count` and `End total_count`
- if those totals differ, the snapshot may be unstable; rerun the fetch

Keep `PER_PAGE=500` unless the user asks to change it.

## Combine

```bash
cd apps/main/scripts/scrape
TEMP_DIR=../../temp_pages_new DB_FILE=../../cultivars.db ./combine-pages-sqlite.sh
```

Verify the combined DB:

```bash
sqlite3 apps/main/cultivars.db "SELECT COUNT(*) AS row_count, COUNT(DISTINCT id) AS distinct_ids FROM cultivars;"
```

Expected:
- `row_count == distinct_ids`

If combine reports an invalid page:
- inspect the bad `page_*.json`
- refetch that page
- rerun combine

## Delta Generation

Pull a fresh prod copy first:

```bash
pnpm main env:dev bash scripts/db-backup.sh
```

Generate the delta against the actual deployed baseline:

```bash
pnpm main exec tsx scripts/generate-v2-ahs-cultivar-delta-sql.ts \
  --prod-db prisma/local-prod-copy-daylily-catalog.db \
  --source-db cultivars.db
```

This writes ignored artifacts under `apps/main/prisma/data-migrations/v2-ahs-cultivar-delta/`:
- `upsert/` chunked one-line SQL for new and changed `V2AhsCultivar` rows
- `link-new-cultivar-references.sql`
- `verify.sql`
- `review-linked-name-drift.sql`
- `summary.json`

Always inspect `summary.json` before applying anything.

## Local Rehearsal

Rehearse on a disposable copy, not the prod copy itself:

```bash
cd apps/main

cp prisma/local-prod-copy-daylily-catalog.db tests/.tmp/v2-delta-rehearsal.sqlite

npx tsx scripts/apply-v2-ahs-cultivar-import.ts \
  --sqlite tests/.tmp/v2-delta-rehearsal.sqlite \
  --import-dir prisma/data-migrations/v2-ahs-cultivar-delta/upsert

sqlite3 tests/.tmp/v2-delta-rehearsal.sqlite \
  < prisma/data-migrations/v2-ahs-cultivar-delta/link-new-cultivar-references.sql

sqlite3 tests/.tmp/v2-delta-rehearsal.sqlite \
  < prisma/data-migrations/v2-ahs-cultivar-delta/verify.sql
```

If the delta also includes one-off cleanup SQL, rehearse that on a copy too.

## Turso Apply

Only do this when the user explicitly asks.

```bash
cd apps/main

npx tsx scripts/apply-v2-ahs-cultivar-import.ts \
  --db daylily-catalog \
  --import-dir prisma/data-migrations/v2-ahs-cultivar-delta/upsert

turso db shell daylily-catalog \
  < prisma/data-migrations/v2-ahs-cultivar-delta/link-new-cultivar-references.sql

turso db shell daylily-catalog \
  < prisma/data-migrations/v2-ahs-cultivar-delta/verify.sql
```

Apply one-off cleanup SQL only when explicitly requested and after local rehearsal.

## Stage

Do not run the full 100k-row V2 import on stage.

This repo uses `seeded-daylily-catalog` as stage. Refresh it by rebuilding the seeded local DB and syncing that seeded DB:

```bash
pnpm main db:seed:local-dev
pnpm main db:sync:seed
```

## Known Limits

- The public daylily search endpoint exposes `last_updated` in row payloads, but it does not support filtering or sorting by `last_updated`. Treat refreshes as fresh snapshots plus delta-vs-prod, not true incremental API syncs.
- New or edited cultivars can shift alphabetical page boundaries while a scrape is running. The `start/end total_count` check is a stability signal, not a guarantee.
- Some legacy `AhsListing` cultivars are genuinely absent from the V2/live site. Do not assume every missing V2 link is a normalization bug.

## References

- `apps/main/docs/v2-ahs-cultivar-migration.md`
- `apps/main/scripts/scrape/fetch-pages.sh`
- `apps/main/scripts/scrape/combine-pages-sqlite.sh`
- `apps/main/scripts/generate-v2-ahs-cultivar-delta-sql.ts`
- `apps/main/scripts/apply-v2-ahs-cultivar-import.ts`
