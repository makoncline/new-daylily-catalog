# Image Asset Migration Plan

## Problem

The current app stores one image URL per row in the legacy `Image` table. Current
production listing/profile images are mostly S3 URLs, and the app uses
Cloudflare Image Transformations to derive display, thumbnail, and blur-sized
images at request time.

This creates avoidable recurring cost and operational risk:

- Cloudflare transformation cost recurs even though the app only needs fixed
  sizes.
- Raw S3 URLs can leak through public pages, feeds, metadata, or crawlers and
  create S3 data-transfer charges.
- The large original image is publicly reachable in some paths.
- Legacy S3 keys are inconsistent and not organized around current app concepts.

From first principles, the app should process each image once, store fixed
static variants, reference only variants from public app surfaces, and keep
originals available for future reprocessing.

## Decisions

- New table: `ImageAsset`.
- New storage: Cloudflare R2.
- R2 bucket name: `daylily-catalog-media`.
- Public image domain: `https://media.daylilycatalog.com`.
- Turso rehearsal branch: `daylily-image-assets-20260613`.
- Keep existing legacy hosts until the feature flag is removed:
  - `https://cf.daylilycatalog.com` for Cloudflare transforms.
  - `https://images.daylilycatalog.com` for the current S3-fronted path.
- Use one public R2 bucket connected to `media.daylilycatalog.com` for originals
  and variants.
- Originals may be public in R2 for now, but app/feed/SEO output should not
  reference originals once variants exist.
- Do not add Cloudflare Workers/Queues initially.
- Generate variants with a local/VPS script using `sharp`.
- Use a feature flag, `USE_IMAGE_ASSETS`, for read-path rollout.

## Current Status

Completed on the local copy, R2, and the Turso branch only. Production Turso has
not been mutated.

- [x] Created/configured R2 bucket `daylily-catalog-media`.
- [x] Connected `media.daylilycatalog.com` to the R2 bucket.
- [x] Added `ImageAsset` schema and additive SQL:
  `prisma/data-migrations/20260613_add_image_asset_table.sql`.
- [x] Added R2 key/url helpers and `USE_IMAGE_ASSETS` read-path support.
- [x] Added dual-write for new uploaded originals: client uploads one file to
  R2 and S3, then creates legacy `Image` plus matching `ImageAsset`.
- [x] Added local-first backfill and variant scripts:
  `scripts/image-assets/backfill-legacy-images-to-r2.mjs` and
  `scripts/image-assets/process-image-asset-variants.mjs`.
- [x] Backfilled legacy local-prod-copy `Image` rows to R2 and local
  `ImageAsset`.
- [x] Imported the local `ImageAsset` manifest into Turso branch
  `daylily-image-assets-20260613`.
- [x] Built and ran production Docker images against the Turso branch with
  `USE_IMAGE_ASSETS=false` and `USE_IMAGE_ASSETS=true`.
- [x] Verified the variant worker runs inside the production Docker image
  against the Turso branch in dry-run mode.
- [x] Limited normal variant processing to `status = "pending_variants"` so
  one failed image becomes `variant_failed` and does not loop forever.
- [x] Chose not to add a scheduled cron/timer in v1. New uploads should use
  best-effort async processing after the original upload succeeds; failures are
  manual recovery items.

Branch manifest counts:

```text
ready             7155
backfill_failed     14
total             7169
```

Docker verification targets:

- Flag off: `http://127.0.0.1:3021/ponderosagardener`
- Flag on: `http://127.0.0.1:3022/ponderosagardener`

Observed behavior:

- Flag off emits old Cloudflare transform URLs over S3.
- Flag on emits R2 `https://media.daylilycatalog.com/...` URLs for profile and
  listing uploaded images.
- The Google Merchant feed emits R2 URLs for uploaded listing images when the
  flag is on.
- Screenshots are stored locally at:
  - `tests/.tmp/docker-branch-flag-off.png`
  - `tests/.tmp/docker-branch-flag-on.png`

## Runtime Decision

Do not add cron/systemd scheduling in this PR. The v1 runtime path is:

1. Upload the original.
2. Create the `ImageAsset` row with `status = "pending_variants"`.
3. Fire best-effort async processing for that one row after the response.
4. Mark success as `ready`; mark failure as `variant_failed`.
5. After success, best-effort revalidate public cache targets for the owning
   listing/profile through the internal revalidate route.
6. Recover failures manually with `--retry-failed`.

This keeps the first production rollout smaller. A scheduled reconciler can be
added later if async processing failures are frequent enough to justify it.

## Data Model

Add `ImageAsset` while keeping legacy `Image` during migration.

```prisma
model ImageAsset {
  id                  String   @id @default(cuid())

  legacyImageId       String?  @unique

  listingId           String?
  userProfileId       String?
  cultivarReferenceId String?

  order               Int      @default(0)
  kind                String   // "profile" | "listing" | "cultivar"
  status              String?

  originalKey         String?
  originalUrl         String?

  generatedOriginalKey String?

  displayKey          String?
  displayUrl          String?

  thumbKey            String?
  thumbUrl            String?

  blurKey             String?
  blurUrl             String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  listing             Listing?           @relation(fields: [listingId], references: [id], onDelete: Cascade)
  userProfile         UserProfile?       @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  cultivarReference   CultivarReference? @relation(fields: [cultivarReferenceId], references: [id], onDelete: Cascade)

  @@index([listingId])
  @@index([userProfileId])
  @@index([cultivarReferenceId])
}
```

The app should enforce exactly one owner field for new rows. `generatedOriginalKey`
is for cultivar generated masters when they exist separately from source
originals.

For migrated and dual-written user-uploaded images, prefer creating
`ImageAsset.id` equal to the legacy `Image.id`, and also populate
`legacyImageId`. This makes backfill idempotent, prevents duplicates after
partial failures, and reduces churn when read models switch from legacy `Image`
rows to `ImageAsset` rows. New cultivar-only assets can use fresh `ImageAsset`
ids with `legacyImageId = null`.

## R2 Layout

Planned one-bucket key layout for the initial R2 proof of concept:

```text
users/{userId}/profile-images/{imageAssetId}/original.{ext}
users/{userId}/profile-images/{imageAssetId}/versions/{versionId}/original.{ext}
users/{userId}/listing-images/{listingId}/{imageAssetId}/original.{ext}
users/{userId}/listing-images/{listingId}/{imageAssetId}/versions/{versionId}/original.{ext}
cultivars/{normalizedName}-{cultivarReferenceId}/{imageAssetId}/source-original.{ext}
cultivars/{normalizedName}-{cultivarReferenceId}/{imageAssetId}/generated-original.{ext}

users/{userId}/profile-images/{imageAssetId}/display-800.webp
users/{userId}/profile-images/{imageAssetId}/thumb-200.webp
users/{userId}/profile-images/{imageAssetId}/blur-20.webp
users/{userId}/profile-images/{imageAssetId}/versions/{versionId}/display-800.webp
users/{userId}/profile-images/{imageAssetId}/versions/{versionId}/thumb-200.webp
users/{userId}/profile-images/{imageAssetId}/versions/{versionId}/blur-20.webp

users/{userId}/listing-images/{listingId}/{imageAssetId}/display-800.webp
users/{userId}/listing-images/{listingId}/{imageAssetId}/thumb-200.webp
users/{userId}/listing-images/{listingId}/{imageAssetId}/blur-20.webp
users/{userId}/listing-images/{listingId}/{imageAssetId}/versions/{versionId}/display-800.webp
users/{userId}/listing-images/{listingId}/{imageAssetId}/versions/{versionId}/thumb-200.webp
users/{userId}/listing-images/{listingId}/{imageAssetId}/versions/{versionId}/blur-20.webp

cultivars/{normalizedName}-{cultivarReferenceId}/{imageAssetId}/display-800.webp
cultivars/{normalizedName}-{cultivarReferenceId}/{imageAssetId}/thumb-200.webp
cultivars/{normalizedName}-{cultivarReferenceId}/{imageAssetId}/blur-20.webp
```

Use IDs for user-owned paths because user/listing slugs can change. Use
`normalizedName` plus `CultivarReference.id` for cultivar paths so operator
inspection is readable but still unique. Do not rename existing cultivar objects
just because the normalized name changes later.

Replacement uploads for an existing legacy `Image.id` must use the versioned
path form. Variant keys are derived from the original key, so this avoids
reusing immutable `display-800.webp`, `thumb-200.webp`, or `blur-20.webp` URLs
after a user replaces an image.

Originals are public in this initial R2 design, but public app surfaces should
converge on static variants. The main cost-control rule is: feeds, metadata,
JSON-LD, public pages, and image components should use `displayUrl`, `thumbUrl`,
or `blurUrl`, not `originalUrl`, once variants exist.

## Variants

- `display`: 800px square WebP.
- `thumb`: 200px square WebP.
- `blur`: 20px square WebP stored as a tiny R2 object, referenced by `blurUrl`.

All public variants are create/delete assets, not mutable edit targets. Upload
them with maximum practical immutable caching:

```text
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/webp
```

## Processing

Do not make the user upload all variants. New uploads should upload one original
to R2, create the `ImageAsset` row, and fire best-effort async processing for
that single row after the response.

Do not add a cron/systemd scheduled runner in v1. The worker script remains the
shared implementation for backfill, async one-row processing, and manual repair,
but the first production rollout should avoid scheduled infrastructure until it
is actually needed.

The variants script should:

- Select `ImageAsset` rows with `status = "pending_variants"` and missing
  `displayUrl`, `thumbUrl`, or `blurUrl`.
- Download/process one asset at a time per worker slot.
- Upload variants to the public R2 bucket.
- Update `displayKey/displayUrl`, `thumbKey/thumbUrl`, and `blurKey/blurUrl`.
- Set successful rows to `status = "ready"`.
- Revalidate affected public listing/profile caches after variants are ready so
  temporary original fallbacks do not remain cached.
- Set failed rows to `status = "variant_failed"` and exclude them from normal
  runs. Manual repair can opt in with `--retry-failed`.
- Emit structured logs and report failures to Sentry.
- Be idempotent and safe to rerun.

Default processing limits should be constants/env-configurable:

```text
IMAGE_ASSET_BACKFILL_CONCURRENCY=5
IMAGE_ASSET_BACKFILL_BATCH_SIZE=50
IMAGE_ASSET_BACKFILL_DOWNLOAD_TIMEOUT_SECONDS=60
IMAGE_ASSET_BACKFILL_MAX_SOURCE_BYTES=...
```

Avoid filling local disk. Prefer streaming or per-asset temp files, verify R2
upload success, then delete any intermediate files before moving to the next
asset.

## Failure Behavior

Once `USE_IMAGE_ASSETS` is enabled, public read paths should prefer variants and
should only use originals as a temporary missing-variant fallback.

Recommended behavior for missing variants:

- Dashboard: use the original image when available and show a processing state.
- Public pages/feeds/metadata: use the original as a temporary fallback for
  missing variants, but log/report it because this is not the target state.
- Always log missing variant rows and report them to Sentry or PostHog with the
  `ImageAsset.id`, owner fields, and missing keys.

This avoids silent failures while keeping the long-term target clear: public app
surfaces should converge on static variants, not originals.

Manual recovery query:

```sql
select
  id,
  kind,
  listingId,
  userProfileId,
  cultivarReferenceId,
  originalUrl,
  updatedAt
from ImageAsset
where status = 'variant_failed'
order by updatedAt desc;
```

Manual retry commands:

```sh
node scripts/image-assets/process-image-asset-variants.mjs --asset-id <id> --retry-failed
node scripts/image-assets/process-image-asset-variants.mjs --retry-failed --limit 25
```

Use `backfill-legacy-images-to-r2.mjs --retry-failed` only for rows already
marked `backfill_failed`; variant repair belongs to
`process-image-asset-variants.mjs --retry-failed` so replacement/versioned keys
are not rewritten to unversioned backfill paths.

Add a scheduled runner later only if failures become common, deploys/restarts
interrupt async processing often, or manual recovery becomes operationally
annoying.

## Path Forward

1. Review the current branch diff and keep the PR scoped to ImageAsset/R2 work.
2. Harden and verify the new-upload path end to end:
   - confirm browser upload progress and error handling are acceptable for the
     dual original upload,
   - confirm new `ImageAsset` rows start as `pending_variants`,
   - run `process-image-asset-variants.mjs` against new uploads and confirm
     they become ready.
3. Verify manual recovery: force or identify one `variant_failed` row in the
   branch, inspect it with the recovery query, then retry it with
   `--asset-id <id> --retry-failed`.
4. Re-run the local-first backfill for the delta created since the first prod
   snapshot.
5. Export the final local `ImageAsset` manifest and import only the delta into
   the Turso branch.
6. Re-run Docker verification against the branch:
   - flag off still serves legacy S3/Cloudflare URLs,
   - flag on serves R2 URLs for profile/listing images,
   - public seller pages, viewing modals, dashboard image reads, and merchant
     feed still work.
7. Decide how to handle the 14 unrecoverable legacy images before production
   apply: leave as `backfill_failed`, remove/hide stale DB rows, or recover from
   a separate backup if one exists.
8. Define/verify R2 backup for originals before deleting or depending solely on
   R2.
9. After explicit approval only, repeat the reviewed schema/data apply against
   production Turso.
10. Enable `USE_IMAGE_ASSETS` in production only after the production apply is
   verified.
11. Leave legacy S3 objects and old hosts intact until R2 backup/restore is
   proven and production has run cleanly.

## Production Data Safety

Treat every Turso operation as production-data work.

This implementation must not mutate production Turso without explicit approval.
Allowed rehearsal targets are:

- restored local SQLite prod copy:
  `prisma/local-prod-copy-daylily-catalog.db`,
- Turso branch: `daylily-image-assets-20260613`.

For production-like runs, use local `.env.production` as the source of secrets,
then override only `DATABASE_URL`, `TURSO_DATABASE_AUTH_TOKEN`, R2 env vars,
`APP_BASE_URL`, and `USE_IMAGE_ASSETS`.

Production apply is out of scope for the initial implementation. A later
production apply should use the same reviewed data artifacts and commands that
passed on the local copy and branch, and should record the apply start time so
Turso point-in-time recovery can target the pre-apply state if needed.

## Cloudflare Guardrails

Allowed during initial implementation:

- Create/configure the R2 proof-of-concept bucket.
- Add a limited set of test/backfill objects.
- Connect `media.daylilycatalog.com` to the R2 bucket.
- Create least-privilege R2 API credentials if needed.

Not allowed without explicit approval:

- Delete or modify existing `images.daylilycatalog.com` or
  `cf.daylilycatalog.com` behavior.
- Enable Workers paid plan, Queues, or other paid add-ons.
- Delete existing S3 or R2 objects.
- Run broad/full production backfill outside the Turso branch test.

## Agent Guardrails

If the agent is blocked or needs approval, it should use the system-level
`notify()` function to contact the user, then stop before taking the blocked
action.

Require user input before:

- Mutating the production Turso database.
- Enabling `USE_IMAGE_ASSETS` in production.
- Deleting or modifying existing S3 objects.
- Deleting or modifying existing Cloudflare hostnames.
- Enabling Workers, Queues, or paid Cloudflare add-ons.
- Running broad/full production backfill outside the Turso branch test.

Do not wait for user input for:

- Creating the R2 proof-of-concept bucket.
- Adding a limited number of test/backfill R2 objects.
- Creating and using a dated Turso branch.
- Applying schema/data changes to the local SQLite prod copy or Turso branch.
- Running local production-like verification with the feature flag off and on.

## Backfill Notes And Findings

The backfill is resumable and local-first. It runs against copied SQLite
production data, uploads R2 objects, and populates local `ImageAsset`. Turso
branch/prod receive reviewed `ImageAsset` exports from that local table; they do
not do image downloads or `sharp` processing while connected to production.

Use the local SQLite `ImageAsset` table as the migration manifest and
idempotency signal. A row should only become `ready` after every required R2
`PutObject` call succeeds. On rerun, the script can skip rows already marked
ready in local SQLite instead of listing or checking R2 objects individually.

If the script attempts to upload the same R2 key again, the normal S3-compatible
`PutObject` behavior is to replace the existing object at that key. This should
be harmless for deterministic reruns, but the desired steady-state path is to
avoid duplicate writes by trusting the local ready rows. Use R2 `ListObjectsV2`
or `HeadObject` only for separate audit/repair checks, not the hot backfill
path.

Implemented per-row flow:

1. Create or find the corresponding `ImageAsset` by `legacyImageId` or matching
   `ImageAsset.id = Image.id`.
2. Download the legacy S3 source.
3. Upload the original to R2.
4. Generate display/thumb/blur variants.
5. Upload variants to public R2.
6. Verify all expected R2 keys are present.
7. Update the local `ImageAsset` row.
8. Export ready local rows for reviewed branch/prod import.
9. Delete local intermediates.

Non-obvious findings:

- The script should process with bounded concurrency. The current default is
  five in-flight images; it does not download the whole batch before uploading.
- Some old S3 objects are real JPEG bytes but have wrong content type or minor
  JPEG issues. Use `sharp(buffer, { failOn: "error" }).rotate()` for source
  decoding; default Sharp decoding rejected six recoverable images.
- The remaining 14 failures are stale legacy DB rows whose S3 URLs return 403;
  representative AWS Console checks showed object-not-found. They are not
  recoverable from the public URL path.
- Docker `--env-file` preserves quotes. Branch Docker verification needed
  unquoted runtime overrides for values such as `APP_BASE_URL`,
  `R2_PUBLIC_BASE_URL`, and `USE_IMAGE_ASSETS`.
- The prod Turso database token did not authorize the branch URL during Docker
  builds. Create/use a branch token for branch-local production builds.
- Docker build context can become huge because this repo has large local
  scratch roots and DB snapshots. Keep `downloads/`, `local/`, `.next/`, and
  local DB files out of Docker context.

## Deletes

The current system deletes image rows from the database but does not delete S3
objects. Keep deletion behavior conservative during migration.

Initial behavior:

- Deleting an image removes/hides the DB row from the app.
- R2 objects are left in place.

Future cleanup can add a separate audited script for unreferenced R2 keys after
backups and restore checks are proven.

## Backups

Do not treat R2 as the only durable copy.

Back up at least the R2 originals. Public variants are cheaper to regenerate,
but backing them up can speed disaster recovery.

Recommended backup approach:

- Periodically sync R2 originals, and optionally variants, to an independent
  backup target such as local/NAS storage or a private AWS backup bucket.
- Store a manifest with key, size, content type, hash/etag, and backup time.
- Verify restore from a sample of originals before deleting any legacy S3 data.
- Keep old S3 image data read-only until the R2 backup process has run and been
  verified.

## Fixed Implementation Defaults

These choices are intentionally fixed so an agent can implement without asking
for more user input:

- Use the R2 bucket name `daylily-catalog-media`.
- Back up R2 originals as required. Backing up variants is optional because they
  can be regenerated.
- Keep `legacyImageId` until the legacy `Image` table is fully retired. Do not
  drop it during this migration.
- Use `cultivarReferenceId` for generated cultivar assets in this migration. Add
  a more specific source table only if future review metadata needs it.
