---
name: v2-ahs-refresh
description: Refresh daylilies.org V2 cultivar data in this repo. Use when fetching a fresh page snapshot, combining it into cultivars.db, generating delta SQL against the local prod copy, rehearsing locally, and only then applying to Turso if explicitly asked.
---

# V2 AHS Refresh

Use this workflow for ongoing `V2AhsCultivar` refreshes.

Default stance:
- use the local prod copy for analysis and rehearsal
- do not touch Turso unless the user explicitly asks
- stop after SQL/review artifacts are created and wait for human review
- let the human ask for reports on exact row/field changes before apply
- apply to Turso only after explicit approval of the reviewed batch

## Inputs

- live source: `https://daylilies.org/search/` + `https://daylilies.org/wp-admin/admin-ajax.php`
- local prod copy: `prisma/local-prod-copy-daylily-catalog.db`
- per-run artifact root: `temp/v2-ahs-refresh-runs/<run-id>/`
- fresh scrape output DB: `$RUN_DIR/cultivars.db`
- fetched page JSON: `$RUN_DIR/pages/`
- delta artifact dir: `$RUN_DIR/v2-ahs-cultivar-delta/`
- review UI output: `$RUN_DIR/review/index.html`

Use a new run directory for each refresh so old snapshots, generated SQL, review
pages, and verification artifacts remain available locally without entering git:

```bash
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$PWD/temp/v2-ahs-refresh-runs/$RUN_ID"
mkdir -p "$RUN_DIR/pages" "$RUN_DIR/review"
```

## Fetch

Run from `scripts/scrape` or use absolute paths. `TEMP_DIR` and `DB_FILE` are resolved from the current shell cwd, not the script file location.

```bash
cd scripts/scrape
TEMP_DIR="$RUN_DIR/pages" ./fetch-pages.sh
```

What to check:
- page 1 fetch succeeds and prints a nonce
- the script prints `Start total_count` and `End total_count`
- if those totals differ, the snapshot may be unstable; rerun the fetch

Keep `PER_PAGE=500` unless the user asks to change it.

## Combine

```bash
cd scripts/scrape
TEMP_DIR="$RUN_DIR/pages" DB_FILE="$RUN_DIR/cultivars.db" ./combine-pages-sqlite.sh
```

Verify the combined DB:

```bash
sqlite3 "$RUN_DIR/cultivars.db" "SELECT COUNT(*) AS row_count, COUNT(DISTINCT id) AS distinct_ids FROM cultivars;"
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
pnpm env:dev bash scripts/db-backup.sh
```

Generate the delta against the actual deployed baseline:

```bash
node --experimental-strip-types scripts/generate-v2-ahs-cultivar-delta-sql.ts \
  --prod-db prisma/local-prod-copy-daylily-catalog.db \
  --source-db "$RUN_DIR/cultivars.db" \
  --output-dir "$RUN_DIR/v2-ahs-cultivar-delta"
```

This writes ignored artifacts under `$RUN_DIR/v2-ahs-cultivar-delta/`:
- `upsert/` chunked one-line SQL for new and changed `V2AhsCultivar` rows
- `link-new-cultivar-references.sql`
- `verify.sql`
- `review-linked-name-drift.sql`
- `summary.json`

Always inspect `summary.json` before applying anything.

Build the local review page into the same run directory:

```bash
node scripts/v2-ahs-refresh-review/build-review-page.mjs \
  --delta-dir "$RUN_DIR/v2-ahs-cultivar-delta" \
  --output "$RUN_DIR/review/index.html"
```

## Human Review Gate

Stop here by default. Do not rehearse or apply the generated SQL until the human
has reviewed the delta summary and had a chance to ask follow-up questions.

Provide a concise report with:
- source row count, prod row count, new rows, changed rows, and prod-only rows
- top changed fields and counts
- high-risk changes: `image_url`, `images_count`, names/normalized names,
  awards, parentage, post status, and non-empty-to-empty field changes
- examples of important changes the human can spot-check in the app after apply

Use `.codex/skills/v2-ahs-update-review/SKILL.md` for classification. Keep a
clear split of:
- source-truth updates that should apply as-is
- corrections that intentionally preserve or override specific source values
- human-review changes that should not be included in the current apply batch

Current image policy:
- `V2AhsCultivar` mirrors the current AHS V2 source.
- If the source returns only a placeholder image, V2 `image_url` should become
  `NULL`.
- Legacy image fallback belongs in display logic via `AhsListing.ahsImageUrl`,
  not in V2 import data.

When the human approves a policy, prepare a run-specific apply folder rather
than editing the raw delta output. Example:

```bash
APPLY_DIR="$RUN_DIR/v2-source-apply-batch"
mkdir -p "$APPLY_DIR/01-new-additions" "$APPLY_DIR/02-v2-source-updates" "$APPLY_DIR/03-corrections"
```

Copy or generate the exact SQL files that should be applied, and write a short
`$APPLY_DIR/README.md` listing:
- what is included
- what is intentionally held back
- any corrective SQL that runs after source-truth upserts
- exact apply order

## Local Rehearsal

After human review and apply-batch preparation, rehearse that exact apply batch
on a disposable copy, not the prod copy itself:

```bash
cp prisma/local-prod-copy-daylily-catalog.db tests/.tmp/v2-delta-rehearsal.sqlite

npx tsx scripts/apply-v2-ahs-cultivar-import.ts \
  --sqlite tests/.tmp/v2-delta-rehearsal.sqlite \
  --import-dir "$RUN_DIR/v2-ahs-cultivar-delta/upsert"

sqlite3 tests/.tmp/v2-delta-rehearsal.sqlite \
  < "$RUN_DIR/v2-ahs-cultivar-delta/link-new-cultivar-references.sql"

sqlite3 tests/.tmp/v2-delta-rehearsal.sqlite \
  < "$RUN_DIR/v2-ahs-cultivar-delta/verify.sql"
```

If the approved batch uses a run-specific apply folder, apply those files in the
same order documented in `$APPLY_DIR/README.md`. Rehearse all corrective SQL too.

Run focused verification queries after rehearsal:
- total V2 row count
- exact new row ids and `CultivarReference` links
- reviewed correction rows
- image counts/fallback-impact counts when image policy changed

## Turso Apply

Only do this when the user explicitly asks after the review gate and local
rehearsal pass.

Create a short-named Turso safety copy first:

```bash
set -a
source .env.production
set +a

turso db create "daylily-pre-v2-$(date -u +%Y%m%d-%H%M)" \
  --from-db daylily-catalog \
  --wait
```

Then apply the exact reviewed batch. Raw delta apply example:

```bash
npx tsx scripts/apply-v2-ahs-cultivar-import.ts \
  --db daylily-catalog \
  --import-dir "$RUN_DIR/v2-ahs-cultivar-delta/upsert"

turso db shell daylily-catalog \
  < "$RUN_DIR/v2-ahs-cultivar-delta/link-new-cultivar-references.sql"

turso db shell daylily-catalog \
  < "$RUN_DIR/v2-ahs-cultivar-delta/verify.sql"
```

If a run-specific `$APPLY_DIR` exists, use its documented apply order instead of
the raw delta commands above. Apply one-off cleanup/correction SQL only when it
was included in the reviewed/rehearsed batch.

After apply, run read-only verification against Turso and report:
- safety-copy database name
- final V2 row count
- new row/reference counts
- reviewed correction rows
- a few app-facing spot-check examples

## Stage

Do not run the full 100k-row V2 import on stage.

This repo uses `seeded-daylily-catalog` as stage. Refresh it by rebuilding the seeded local DB and syncing that seeded DB:

```bash
pnpm db:seed:local-dev
pnpm db:sync:seed
```

## Known Limits

- The public daylily search endpoint exposes `last_updated` in row payloads, but it does not support filtering or sorting by `last_updated`. Treat refreshes as fresh snapshots plus delta-vs-prod, not true incremental API syncs.
- New or edited cultivars can shift alphabetical page boundaries while a scrape is running. The `start/end total_count` check is a stability signal, not a guarantee.
- Some legacy `AhsListing` cultivars are genuinely absent from the V2/live site. Do not assume every missing V2 link is a normalization bug.

## References

- `docs/v2-ahs-cultivar-migration.md`
- `scripts/scrape/fetch-pages.sh`
- `scripts/scrape/combine-pages-sqlite.sh`
- `scripts/generate-v2-ahs-cultivar-delta-sql.ts`
- `scripts/apply-v2-ahs-cultivar-import.ts`
