# V2 Image Review Tooling

Tracked tooling for the local-only daylily image workflow lives here.

Runtime state stays out of git:
- outputs, logs, queue DB: `downloads/v2-ahs-image-review/`
- source image cache: `downloads/v2-ahs-images/`
- browser profiles, target cache, local venv, Xcode build products: `local/v2-ahs-image-review/`
- local S3 uploader credentials: `local/v2-ahs-image-review/s3.env`
- failure debug artifacts: `downloads/v2-ahs-image-review/debug/`

## Main entrypoints

- queue sync: `node scripts/image-processing/v2-ahs-image-review/sync.mjs`
- review server: `node scripts/image-processing/v2-ahs-image-review/server.mjs`
- Codex-native image generation: `scripts/image-processing/v2-ahs-image-review/codex-native-image-generation.md`
- ChatGPT worker: `node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs --limit 50`
- S3 backup: `node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs`

## Review UI

Start the server:

```bash
node scripts/image-processing/v2-ahs-image-review/server.mjs
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

For `agent-browser`, connect once to the live headed Chrome session:

```bash
./scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh connect
```

Then reuse the attached session without re-passing CDP:

```bash
./scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh get url
./scripts/image-processing/v2-ahs-image-review/agent-browser-chatgpt.sh snapshot -i
```

When the `agent-browser` worker hits a real failure, it now writes:
- a text snapshot with URL, title, body excerpts, and `snapshot -i --urls`
- a full-page screenshot

Those land under:

```text
downloads/v2-ahs-image-review/debug/
```

## S3 backup

Use this to copy the generated images somewhere durable outside the laptop:

```bash
node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs
```

Dry run first:

```bash
node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs --dry-run
```

Optional flags:
- `--limit 1` to test only the first edited image

Each run updates a SQLite backup manifest:

```text
downloads/v2-ahs-image-review/s3-manifest.sqlite
```

The manifest records `CultivarReference.id`, V2 AHS id, normalized name, local
path, S3 key, sha256, byte size, and whether the image was uploaded, already
present, or only planned by a dry run.

Edited image object names are derived from the local production copy's
`CultivarReference` rows:

```text
cultivar-images/{normalized-name}-{CultivarReference.id}.png
```

Local variant files with names like `1000_1.png` are skipped. The backup stores
one image per cultivar reference.

You can also set:
- `V2_IMAGE_REVIEW_S3_BUCKET`
- `V2_IMAGE_REVIEW_S3_PREFIX`

For this local workflow, put uploader credentials in:

```text
local/v2-ahs-image-review/s3.env
```

That file is gitignored and is loaded by `backup-to-s3.mjs` after `.env.development`, so image-processing credentials can override the app's normal AWS credentials without affecting the app.

## Notes

- The tracked scripts live under `scripts/image-processing/v2-ahs-image-review/`.
- The ignored scratch dirs are intentionally broad so image/log/browser churn does not pollute `git status`.
- Create any fresh ChatGPT project manually in the browser first, then pass its `/project` URL with `--project-url`.
- `--rate-limit-cooldown-seconds` is also the long wait used before the worker retries a human-verification hit or a recoverable browser-session stall.
- Example:

```bash
node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs \
  --project-url "https://chatgpt.com/g/.../project" \
  --limit 10
```

- To keep a fresh project small, you can also delete each successful chat after the image is saved:
- That `--delete-after-save` path now uses the project row UI menu (`...` -> `Delete` -> confirm `Delete`) inside the attached ChatGPT session.

```bash
node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs \
  --project-url "https://chatgpt.com/g/.../project" \
  --delete-after-save \
  --limit 10
```

- Chrome still needs to be authenticated in the attached live session.
- The older local FLUX/watermark path was removed; this tracked toolset is only for the current ChatGPT-based generation and review flow.
