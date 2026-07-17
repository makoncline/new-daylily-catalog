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
them. The tooling resolves this root to an absolute path before opening the
queue, reading sources, or writing outputs, so running from a worktree does not
create worktree-local artifacts.

## Main entrypoints

- review server: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/server.mjs`
- Codex-native generation: `pnpm images:generate --limit 20 --concurrency 10`
- Legacy ChatGPT worker fallback: `pnpm main exec node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs --limit 50`

## Generation Flow

The Codex-native worker:

1. drains all existing retryable queue rows
2. checks once for listings linked to a `CultivarReference` without a ready
   generated cultivar `ImageAsset`
3. skips cultivar references already recorded in `review.sqlite`
4. downloads and queues every missing linked source, preferring V2
   `V2AhsCultivar.image_url` and falling back to legacy `AhsListing.ahsImageUrl`
   when V2 is missing
5. drains the catch-up rows
6. fills remaining capacity from the alphabetical non-linked backlog

Start by pulling a fresh local prod copy. The worker reads
`prisma/local-prod-copy-daylily-catalog.db`; a stale copy from before the
generated cultivar `ImageAsset` import will incorrectly queue already-covered
cultivars.

Run:

```bash
pnpm env:dev bash scripts/db-backup.sh
pnpm images:generate --limit 20 --concurrency 10
```

From a linked worktree, perform the [exceptional full-snapshot copy](../../../docs/db-backup-readme.md#linked-worktrees) before running generation.

Spot-check generated images in the local UI, then run the generated cultivar
ImageAsset/R2 backfill. Rows marked `review` are generated and importable; use
`rejected` or `pending` only when a bad output needs regeneration.

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
