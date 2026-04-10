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

## Notes

- The tracked scripts live under `scripts/image-processing/v2-ahs-image-review/`.
- The ignored scratch dirs are intentionally broad so image/log/browser churn does not pollute `git status`.
- The ChatGPT worker assumes the daylily-images project URL already exists and that Chrome is authenticated.
- The older local FLUX/watermark path was removed; this tracked toolset is only for the current ChatGPT-based generation and review flow.
