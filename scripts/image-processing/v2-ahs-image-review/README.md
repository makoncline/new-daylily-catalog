# V2 Image Review Tooling

Tracked tooling for the local-only daylily image workflow lives here.

Runtime state stays out of git:
- outputs, logs, queue DB: `downloads/v2-ahs-image-review/`
- source image cache: `downloads/v2-ahs-images/`
- browser profiles, target cache, local venv, Xcode build products: `local/v2-ahs-image-review/`
- failure debug artifacts: `downloads/v2-ahs-image-review/debug/`

## Main entrypoints

- queue sync: `node scripts/image-processing/v2-ahs-image-review/sync.mjs`
- review server: `node scripts/image-processing/v2-ahs-image-review/server.mjs`
- ChatGPT worker: `node scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs --limit 50`
- S3 backup: `node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs --bucket <bucket>`

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
node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs \
  --bucket your-bucket-name
```

Dry run first:

```bash
node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs \
  --bucket your-bucket-name \
  --dry-run
```

Optional flags:
- `--prefix your/path` to change the S3 key prefix. Default: `v2-ahs-image-review`
- `--include-db` to also upload `downloads/v2-ahs-image-review/review.sqlite`
- `--force` to re-upload even when the remote file already has the same sha256

You can also set:
- `V2_IMAGE_REVIEW_S3_BUCKET`
- `V2_IMAGE_REVIEW_S3_PREFIX`

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
