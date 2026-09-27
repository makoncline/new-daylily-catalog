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

From a linked worktree, perform the [exceptional full-snapshot copy](./db-backup-readme.md#linked-worktrees) before continuing.

## 2. Generate Images

Run a bounded Codex-native image generation batch:

```bash
pnpm images:generate --limit 20 --concurrency 10
```

The worker uses this prompt for a square output:

```text
generate an edited image (do not edit the original. do not reframe or crop original. do not use code execution to edit reference image). remove all text, zoom out slightly, improve quality, square aspect ratio.
```

Use `pnpm images:control status` to inspect a running worker. Use
`pnpm images:control drain` to finish its active images and stop.

The worker:

1. drains existing retryable queue rows
2. checks the local prod copy once for newly linked cultivars without a ready
   generated `ImageAsset`
3. skips cultivar references already recorded in `review.sqlite`
4. downloads and queues every missing linked source image
5. drains those catch-up rows
6. fills any remaining batch capacity from the alphabetical non-linked backlog

Source images prefer V2 and fall back to legacy AHS when V2 is absent. Downloads
and queue state stay under `~/daylily-catalog-image-processing/`.

The worker promotes each generated image into the review queue and marks its
row `review` only after the output files exist. It writes per-run logs under
`~/daylily-catalog-image-processing/v2-ahs-image-review/codex-native-runs/`.

## 3. Spot-Check Generated Images

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

## 4. Backfill R2 And Local ImageAsset Rows

Use a fresh local prod copy or a deliberate rehearsal copy. Do not run this
against production Turso.

Dry-run from the repository root:

```bash
DATABASE_URL=file:./prisma/local-prod-copy-daylily-catalog.db \
  pnpm main exec node scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs --dry-run
```

After reviewing the dry run, use the local database and production R2
credentials for the write run:

```bash
DATABASE_URL=file:./prisma/local-prod-copy-daylily-catalog.db \
IMAGE_ASSET_BACKFILL_CONCURRENCY=1 \
  pnpm env:prod node scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs
```

The script:

- reads generated rows from `review.sqlite` with status `review` or `approved`
- skips cultivar references that already have a ready generated cultivar
  `ImageAsset` in the DB
- does not issue R2 object-existence reads
- uploads generated original plus display/thumb/blur variants
- creates the ready local `ImageAsset` row only after uploads succeed

## 5. Import To Production

Export only the new local `ImageAsset` rows, inspect the SQL, and apply to
production Turso only after explicit approval. This should remain a separate
review step from generation/upload.

After a production import, refresh or mirror the local prod copy before the next
generation run; queue bookkeeping is based on the local DB.

## 6. Clean Up Imported Local Artifacts

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

## Related V2 Data Refresh

For newly added or changed V2 cultivar source data, use the V2 AHS refresh
workflow instead:

```text
.codex/skills/v2-ahs-refresh/SKILL.md
```

That process fetches daylilies.org data, builds `apps/main/cultivars.db`,
generates delta SQL against `apps/main/prisma/local-prod-copy-daylily-catalog.db`,
and pauses for human review before applying SQL to Turso.
