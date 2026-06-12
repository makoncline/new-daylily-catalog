# Codex-Native Image Generation

This is the current preferred way to generate edited V2 AHS daylily images when
Codex image generation is available. It uses Codex subagents with the local
source image attached, then promotes only verified filesystem outputs into the
same review queue used by the older browser-based ChatGPT worker.

This method has been producing better review candidates than the attached
browser workflow because it avoids ChatGPT project UI instability, Chrome
automation prompts, project-thread cleanup, and browser session failures.

## Runtime Paths

Source images:

```text
downloads/v2-ahs-images/{id}.jpg
```

Native candidate outputs:

```text
downloads/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png
```

Promoted review images:

```text
downloads/v2-ahs-image-review/edited/{id}.png
```

Queue DB:

```text
downloads/v2-ahs-image-review/review.sqlite
```

## Prompt

Use the exact prompt unless intentionally testing a new prompt version:

```text
generate an edited image (do not edit the original. do not reframe or crop origional. do not use code execution). remove all text, zoom out, improve quality
```

The misspellings are preserved because this is the prompt used for the first
successful Codex-native batch.

## Worker Contract

For each queue row, send one subagent:

- The local source image as a `local_image` attachment.
- The exact prompt above.
- The exact candidate path to save.
- An instruction not to modify the DB.
- A final-response request for the saved path plus a short quality note.

Example worker instruction:

```text
You are processing one daylily image for the Codex-native V2 AHS image review queue. You are not alone in the codebase; do not revert or alter others' files. Use the provided local reference image. Generate an edited image with this exact prompt/intent: "generate an edited image (do not edit the original. do not reframe or crop origional. do not use code execution). remove all text, zoom out, improve quality". Save exactly one PNG to /Users/makon/dev/new-daylily-catalog/downloads/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png. Do not modify the DB. In your final response, report the saved path and a brief quality note. If generation fails or the source is invalid, say so clearly.
```

## Queue Claiming

Claim rows before sending them to workers:

```sql
UPDATE v2_image_review_queue
SET status = 'processing',
    attempts = attempts + 1,
    lastError = NULL,
    updatedAt = datetime('now')
WHERE id = '{id}'
  AND status = 'pending';
```

Use the same queue priority already used by the workflow unless there is a
reason to override it. During the first large Codex-native run, rows were pulled
from pending order and drained until no `pending` or `processing` rows remained.

## Promotion Rule

Never trust the worker final message by itself. Some subagents report a saved
PNG path even when no file is visible in the main workspace.

Before promoting:

```bash
test -f downloads/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png
```

If the file exists:

```bash
cp downloads/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png \
  downloads/v2-ahs-image-review/edited/{id}.png
```

Then mark it for review:

```sql
UPDATE v2_image_review_queue
SET editedPath = '/Users/makon/dev/new-daylily-catalog/downloads/v2-ahs-image-review/edited/{id}.png',
    status = 'review',
    promptVersion = 'codex-native-imagegen-v1',
    lastError = NULL,
    updatedAt = datetime('now')
WHERE id = '{id}';
```

## Failure Handling

If the worker says it saved a file but `test -f` fails:

```sql
UPDATE v2_image_review_queue
SET status = 'failed',
    editedPath = NULL,
    promptVersion = NULL,
    lastError = 'Codex-native worker reported a saved file, but no usable file was present in workspace',
    updatedAt = datetime('now')
WHERE id = '{id}';
```

If the image tool produces an in-chat preview but no writable file:

```sql
UPDATE v2_image_review_queue
SET status = 'failed',
    editedPath = NULL,
    promptVersion = NULL,
    lastError = 'Codex-native image generation produced a preview but no writable PNG artifact',
    updatedAt = datetime('now')
WHERE id = '{id}';
```

If generation is rejected with no output:

```sql
UPDATE v2_image_review_queue
SET status = 'failed',
    editedPath = NULL,
    promptVersion = NULL,
    lastError = 'Codex-native image generation rejected the request with no output',
    updatedAt = datetime('now')
WHERE id = '{id}';
```

If the source image is an invalid fake JPEG body, mark it `source_invalid`
instead of retrying. Some V2 source assets are 8-byte text bodies like
`404.html` served as JPEGs.

## Compare UI

Start the local review server:

```bash
node scripts/image-processing/v2-ahs-image-review/server.mjs
```

Open:

```text
http://127.0.0.1:4310/compare
```

The compare page shows each Codex-native review item as:

```text
{id}
original image | generated image
```

The API behind it is:

```text
http://127.0.0.1:4310/api/codex-native
```

That endpoint returns rows with:

```sql
status = 'review'
AND promptVersion = 'codex-native-imagegen-v1'
AND editedPath IS NOT NULL
```

## Concurrency

The observed subagent limit is six active agents. Attempts above that can fail
with `agent thread limit reached`.

Recommended pattern:

- Run up to six workers while save behavior is healthy.
- Close each completed agent promptly.
- Reduce concurrency if workers start returning preview-only or missing-file
  results at a high rate.
- Continue to verify every candidate file before updating the DB.

## Validation Checklist

Before calling a run done:

```sql
SELECT status, COUNT(*)
FROM v2_image_review_queue
GROUP BY status
ORDER BY status;
```

There should be no `pending` or `processing` rows for the drained batch.

Confirm Codex-native review count:

```sql
SELECT COUNT(*)
FROM v2_image_review_queue
WHERE status = 'review'
  AND promptVersion = 'codex-native-imagegen-v1'
  AND editedPath IS NOT NULL;
```

Confirm the compare endpoint returns the same number of items:

```bash
curl -s -o /tmp/codex-native.json http://127.0.0.1:4310/api/codex-native
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('/tmp/codex-native.json','utf8')); console.log(j.items.length);"
```

Finally, refresh `/compare` and visually spot-check the newest rows. If a row is
rejected during review, move or remove its generated file from `edited/`, clear
`editedPath` and `promptVersion`, and mark the DB row `failed` with a reviewer
note in `lastError`.
