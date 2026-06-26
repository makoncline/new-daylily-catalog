# V2 Image Review Tooling

Tracked tooling for the local-only daylily image workflow lives here.

For the end-to-end generated cultivar image catch-up process, start with:

```text
apps/main/docs/generated-cultivar-image-catchup.md
```

Runtime state stays out of git:

- outputs, logs, queue DB: `~/daylily-catalog-image-processing/v2-ahs-image-review/`
- source image cache: `~/daylily-catalog-image-processing/v2-ahs-images/`
- browser profiles, target cache, local venv, Xcode build products: `~/daylily-catalog-image-processing/v2-ahs-image-review/local/`
- failure debug artifacts: `~/daylily-catalog-image-processing/v2-ahs-image-review/debug/`

Set `V2_AHS_IMAGE_REVIEW_DATA_ROOT` to override the runtime root. The default
keeps generated assets outside the repository so a worktree reset cannot delete
them.

## Main entrypoints

- source image download: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/download-catchup-source-images.ts`
- queue sync: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/sync.mjs`
- review server: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/server.mjs`
- Codex-native generation: ask a Codex thread/agent to follow
  `apps/main/scripts/image-processing/v2-ahs-image-review/codex-native-image-generation.md`
- Legacy ChatGPT worker fallback: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs --limit 50`

## Linked Cultivar Catch-Up

The source download and queue sync are intentionally scoped to catch-up work:

1. Find listings linked to a `CultivarReference`.
2. Skip cultivar references that already have a ready generated cultivar
   `ImageAsset`.
3. Download the current source image for the cultivar, preferring V2
   `V2AhsCultivar.image_url` and falling back to legacy `AhsListing.ahsImageUrl`
   when the V2 image is missing.
4. Queue the downloaded source image by `CultivarReference.id`.

Start by pulling a fresh local prod copy. These scripts read
`prisma/local-prod-copy-daylily-catalog.db`; a stale copy from before the
generated cultivar `ImageAsset` import will incorrectly queue already-covered
cultivars.

Run:

```bash
pnpm env:dev bash scripts/db-backup.sh
pnpm main exec node scripts/image-processing/v2-ahs-image-review/download-catchup-source-images.ts --dry-run
pnpm main exec node scripts/image-processing/v2-ahs-image-review/download-catchup-source-images.ts
pnpm main exec node scripts/image-processing/v2-ahs-image-review/sync.mjs
```

Then ask a Codex thread/agent to generate images from the queue using
`codex-native-image-generation.md`, spot-check the generated images in the local
UI, and later run the generated cultivar ImageAsset/R2 backfill once the
long-running generation pass is complete. Rows marked `review` are generated and
importable; use `rejected` or `pending` only when a bad output needs manual
action or regeneration.

The generated cultivar R2 backfill reads `review` and legacy `approved` rows from
`~/daylily-catalog-image-processing/v2-ahs-image-review/review.sqlite` and
skips any cultivar reference that already has a ready generated cultivar
`ImageAsset` in the database. It uses the database as the idempotency boundary;
it does not issue R2 object-existence reads.

## Review UI

Start the server:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/server.mjs
```

Then open:

```text
http://127.0.0.1:4310
```

Gallery view:

```text
http://127.0.0.1:4310/gallery
```

## ChatGPT browser helpers

This is the older fallback path. Prefer Codex-native generation when available.

For `agent-browser`, connect once to the live headed Chrome session:

```bash
./apps/main/scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh connect
```

Then reuse the attached session without re-passing CDP:

```bash
./apps/main/scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh get url
./apps/main/scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh snapshot -i
```

When the `agent-browser` worker hits a real failure, it now writes:

- a text snapshot with URL, title, body excerpts, and `snapshot -i --urls`
- a full-page screenshot

Those land under:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/debug/
```

## Notes

- The tracked scripts live under `apps/main/scripts/image-processing/v2-ahs-image-review/`.
- The ignored scratch dirs are intentionally broad so image/log/browser churn does not pollute `git status`.
- The ChatGPT worker assumes the daylily-images project URL already exists and that Chrome is authenticated.
- The older local FLUX/watermark path was removed; this tracked toolset is for
  Codex-native generation plus the legacy ChatGPT browser fallback.
