# Generated Cultivar Image Catch-Up

Use this runbook when production has newly linked listings whose
`CultivarReference` does not yet have a ready generated cultivar `ImageAsset`.

This is separate from the V2 AHS data refresh. The V2 data refresh updates
`V2AhsCultivar` source data; this catch-up generates and imports site-owned
image assets for linked cultivars.

## Runtime State

Runtime files are intentionally outside the repo:

```text
~/daylily-catalog-image-processing/
  v2-ahs-images/
  v2-ahs-image-review/
    review.sqlite
    edited/
    codex-native-candidates/
    debug/
```

Override the root with `V2_AHS_IMAGE_REVIEW_DATA_ROOT` if needed.

## 1. Refresh The Prod Copy

The catch-up scripts use the local prod copy as the source of truth for:

- which listings are linked to cultivar references
- which cultivar references already have ready generated cultivar `ImageAsset`s
- V2 source image URL first, legacy AHS image URL second

Run from repo root:

```bash
pnpm env:dev bash scripts/db-backup.sh
```

## 2. Count Missing Linked Cultivar Images

Dry-run first. This does not download images.

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/download-catchup-source-images.ts --dry-run
```

The output includes total queue size and V2-vs-legacy source counts.

## 3. Download Source Images

This downloads only source images for linked cultivar references that do not
already have a ready generated cultivar `ImageAsset` in the local prod copy.
Rows already marked `source_invalid` in the review DB are skipped.

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/download-catchup-source-images.ts
```

Outputs land in:

```text
~/daylily-catalog-image-processing/v2-ahs-images/
```

## 4. Sync The Review Queue

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/sync.mjs
```

This writes/updates:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/review.sqlite
```

## 5. Generate Images

Use Codex-native image generation. Follow:

```text
apps/main/scripts/image-processing/v2-ahs-image-review/codex-native-image-generation.md
```

Generated candidates should be promoted into:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/edited/{cultivarReferenceId}.png
```

Rows should be marked `review` after promotion.

## 6. Spot-Check Generated Images

Start the local review UI:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/server.mjs
```

Open:

```text
http://127.0.0.1:4310
http://127.0.0.1:4310/gallery
```

Use this UI to compare original and generated images side-by-side. A row with
status `review` means the generated file exists and is importable; it does not
require formal approval. Only change rows manually when something is wrong:
requeue obvious bad generations, reject known-bad outputs, and leave
`source_invalid` rows out of blind retries.

Queue sync marks rows `imported` when the local prod copy already has a ready
generated cultivar `ImageAsset`. Older pre-`CultivarReference.id` review rows
that are not safely importable by the current workflow are marked `legacy`.

## 7. Backfill R2 And Local ImageAsset Rows

Use a fresh local prod copy or a deliberate rehearsal copy. Do not run this
against production Turso.

Dry-run:

```bash
cd apps/main

DATABASE_URL=file:./prisma/local-prod-copy-daylily-catalog.db \
  node scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs --dry-run
```

Approved write run:

```bash
cd apps/main

set -a
source ../../.env.production
set +a

DATABASE_URL=file:./prisma/local-prod-copy-daylily-catalog.db \
IMAGE_ASSET_BACKFILL_CONCURRENCY=1 \
  node scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs
```

The script:

- reads generated rows from `review.sqlite` with status `review` or `approved`
- skips cultivar references that already have a ready generated cultivar
  `ImageAsset` in the DB
- does not issue R2 object-existence reads
- uploads generated original plus display/thumb/blur variants
- creates the ready local `ImageAsset` row only after uploads succeed

## 8. Import To Production

Export only the new local `ImageAsset` rows, inspect the SQL, and apply to
production Turso only after explicit approval. This should remain a separate
review step from generation/upload.

After a production import, refresh or mirror the local prod copy before running
`sync.mjs`; queue bookkeeping is based on the local DB.

## 9. Clean Up Imported Local Artifacts

Only clean up rows that are already marked `imported` and are still covered by a
ready generated cultivar `ImageAsset` in the local prod copy.

Dry-run generated artifacts:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/cleanup-imported-artifacts.mjs
```

Delete generated artifacts:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/cleanup-imported-artifacts.mjs --apply
```

Delete generated artifacts plus downloaded source originals for imported rows:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/cleanup-imported-artifacts.mjs --include-originals --apply
```

The script leaves `review.sqlite` intact as the durable completion log and writes
a cleanup manifest under:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/manifests/
```

## Import Record: 2026-06-20

- Created Turso checkpoint branch `dlcat-pre-imgcatch-20260620t1743`.
- Imported 526 generated cultivar `ImageAsset` rows to production.
- Production ready cultivar assets after import: `8382`.
- Verification passed: `PRAGMA foreign_key_check`, required URL/key presence,
  and duplicate ready cultivar-reference scan.
- Review queue was synced afterward; only 3 known `source_invalid` rows remain.
- Imported a follow-up batch of 10 newly linked generated cultivar
  `ImageAsset` rows later the same day.
- Production ready cultivar assets after the follow-up import: `8392`.
- The follow-up rows were synced to `imported` and local artifacts were cleaned
  up with a manifest.

## Related V2 Data Refresh

For newly added or changed V2 cultivar source data, use the V2 AHS refresh
workflow instead:

```text
.codex/skills/v2-ahs-refresh/SKILL.md
apps/main/docs/v2-ahs-cultivar-migration.md
```

That process fetches daylilies.org data, builds `apps/main/cultivars.db`,
generates delta SQL against `apps/main/prisma/local-prod-copy-daylily-catalog.db`,
and pauses for human review before applying SQL to Turso.
