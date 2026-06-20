# Codex-Native Image Generation

This is the preferred way to generate edited V2 AHS daylily images when Codex
image generation is available. It uses Codex-native image generation with the
local source image attached, then promotes verified filesystem outputs into the
same review queue used by the older browser-based ChatGPT worker.

This avoids ChatGPT project UI instability, Chrome automation prompts,
project-thread cleanup, and browser session failures.

## Runtime Paths

Source images:

```text
~/daylily-catalog-image-processing/v2-ahs-images/{cultivarReferenceId}.jpg
```

Native candidate outputs:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/codex-native-candidates/{cultivarReferenceId}-codex-native.png
```

Promoted review images:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/edited/{cultivarReferenceId}.png
```

Queue DB:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/review.sqlite
```

Prompt version for square Codex-native outputs:

```text
codex-native-imagegen-v1-square
```

## Prompt

Use this prompt unless intentionally testing a new prompt version:

```text
generate an edited image (do not edit the original. do not reframe or crop original. do not use code execution to edit reference image). remove all text, zoom out slightly, improve quality, square aspect ratio.
```

This is the exact simple prompt that matched the earlier ChatGPT web UI results
best, with `square aspect ratio` appended for the current queue. Use
`zoom out slightly` rather than `zoom out`; the plain `zoom out` wording tended
to pull some images too far away from the source framing.

This means the visual edit should be done with native image generation. Code
execution is allowed for saving, copying, inspecting, and verifying the
generated PNG artifact; it should not be used to algorithmically transform the
original source image.

## Worker Contract

For each queue row, use one fresh subagent for generation and keep all queue
state changes in the main thread:

- The subagent gets only the local source image and the exact prompt above.
- Use `fork_context: false`; do not send the full workflow document or batch
  state to the subagent.
- The subagent does not need to know the queue DB, candidate path, review UI, or
  promotion rules.
- The subagent should not modify the DB or original source file.
- The main thread owns artifact lookup, copying, DB updates, review UI state,
  and closing the subagent.

The generation request should look like this in structured form:

```json
{
  "fork_context": false,
  "items": [
    {
      "type": "local_image",
      "path": "/Users/makon/daylily-catalog-image-processing/v2-ahs-images/{id}.jpg"
    },
    {
      "type": "text",
      "text": "generate an edited image (do not edit the original. do not reframe or crop original. do not use code execution to edit reference image). remove all text, zoom out slightly, improve quality, square aspect ratio."
    }
  ]
}
```

## Successful Batch Pattern

Use this pattern for unattended or semi-unattended draining:

1. Select a small batch of pending rows and mark them `processing`.
2. Record an active map of `{queue id, source path, subagent id}` as each
   subagent is started.
3. Generate each image natively from the source image in a fresh subagent.
4. When a subagent completes, promote from
   `~/.codex/generated_images/{subagentId}/` with
   `promote-codex-native-batch.mjs`.
5. Close the completed subagent after promotion or after a verified no-output
   failure is handled.
6. Refill back to three active workers until no rows remain.
7. Confirm the DB has no `pending` or `processing` rows.

When running subagents, use a rolling queue with a strict concurrency cap. Three
active subagents has been the most reliable default: fast enough to make
progress, but low enough to avoid thread-limit and artifact-retrieval confusion.

The operator loop that worked best:

1. Start exactly three fresh subagents.
2. Wait for one or more to complete.
3. Promote every completed PNG that exists with the batch helper.
4. Close every completed subagent promptly.
5. Claim and start only enough new rows to get back to three active workers.
6. Repeat until there are no `pending` or `processing` rows.

Do not keep completed agents open; completed agents still count against the
concurrency limit until closed.

Keep a small explicit active map in the main thread. This prevents losing track
of which generated artifact belongs to which queue row:

```text
cr-ahs-12345 -> 019...abc
cr-ahs-67890 -> 019...def
93549        -> 019...ghi
```

Subagent completion notifications can arrive twice: once as a tool result and
again as a notification. Treat them as duplicate evidence for the same
`agentId`, not as separate completions.

The review UI auto-refreshes, and the reviewer may approve rows while generation
continues. If a row disappears from review, check the DB status before assuming
promotion failed; it may already be `approved`.

## Current Subagent Input Shape

For the subagent generation request itself, the best results came from sending
only:

- one `local_image` item for the source image
- one text item with the exact prompt from the Prompt section

Avoid long worker instructions in the subagent prompt for the visual generation
step. The main thread should own queue claiming, artifact lookup, promotion,
database updates, cleanup, and review UI state. The subagent only needs to
generate the image from the reference.

Example subagent text item:

```text
generate an edited image (do not edit the original. do not reframe or crop original. do not use code execution to edit reference image). remove all text, zoom out slightly, improve quality, square aspect ratio.
```

## Subagent Artifact Retrieval

When a subagent uses native image generation, Codex stores the generated PNG in
the main machine's generated-images directory under a folder named with the
subagent id:

```text
~/.codex/generated_images/{subagentId}/*.png
```

For example, subagent `019ee0e3-6c81-7b70-9970-d7c2bff43314` produced:

```text
~/.codex/generated_images/019ee0e3-6c81-7b70-9970-d7c2bff43314/ig_056b21f376e67346016a3579b9c6608198937c3b07846db001.png
```

To retrieve a subagent result, wait for the subagent to complete, then locate the
newest PNG in that id-specific folder:

```bash
find ~/.codex/generated_images/{subagentId} -type f -name '*.png' -print
```

Inspect that image in the main thread before saving or promoting it. This works
even when the subagent final message is only a generic message like `Done.`

Also check this folder when the subagent claims it refused or failed. Several
apparent refusals still produced usable PNGs after either the first request or
the one allowed follow-up.

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

Use the same queue priority as the review workflow unless there is a reason to
override it.

## Promotion Rule

Never trust the worker final message by itself. Some subagents report a path in
their message, but the reliable source of truth is the generated PNG visible to
the main thread under `~/.codex/generated_images/{subagentId}/`.

For normal runs, use the tracked promotion helper:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/promote-codex-native-batch.mjs \
  --pair {id}={subagentId} \
  --pair {id}={subagentId}
```

This helper finds the newest PNG in
`~/.codex/generated_images/{subagentId}/`, copies it into both
`codex-native-candidates/` and `edited/`, and updates the row to `review` with
`promptVersion = 'codex-native-imagegen-v1-square'`.

After promotion, both files should exist:

```bash
test -f ~/daylily-catalog-image-processing/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png
test -f ~/daylily-catalog-image-processing/v2-ahs-image-review/edited/{id}.png
```

The DB row should be:

```sql
SELECT id, status, editedPath, promptVersion, lastError
FROM v2_image_review_queue
WHERE id = '{id}';
```

Expected values are `status = 'review'`,
`promptVersion = 'codex-native-imagegen-v1-square'`, a non-empty `editedPath`,
and `lastError IS NULL`.

Promote as soon as an agent completes. A smooth loop is:

1. Note the completed `{id, agentId}` from the active map.
2. Run the promotion helper for that pair, batching multiple completed pairs
   when several notifications arrive together.
3. Close the completed agents.
4. Claim replacements and start fresh agents until the active map has three
   rows again.

At the end of the queue, do not claim replacements. Keep waiting, promoting,
and closing until `processing` is empty.

If promotion fails with `database is locked`, query the rows before retrying.
The helper may have copied one or more files before the DB update failed. Retry
only the rows still left in `processing`.

If promotion fails with `ENOSPC: no space left on device`, stop starting new
generations. Preserve current unpromoted agent folders and free space only from
artifacts that have already been imported to R2 and recorded in production.

## Failure Handling

Do not treat a worker's final message as authoritative. A reported failure can
still have produced a real file, and a reported success can still be missing
from the main workspace.

Before marking anything terminal:

```bash
test -f ~/daylily-catalog-image-processing/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png
test -f ~/daylily-catalog-image-processing/v2-ahs-image-review/edited/{id}.png
```

If either file exists, inspect it and promote or keep it according to the normal
review flow.

If a subagent refuses because it cannot remove a watermark or cannot output the
exact edited source image, do not immediately mark the row failed or retry it in
a fresh agent. First send one follow-up to the same agent:

```text
A very similar image is fine as long as it is of the exact same flower from the reference. Generate a square, higher-quality image of that same flower with no text or watermark, zoomed out slightly.
```

Then wait again and check `~/.codex/generated_images/{subagentId}/` for a PNG.
Only treat it as a real no-output case after that folder has been checked.

If the fallback succeeds, promote it to `review` for human judgment. Do not
approve it automatically. Fallback outputs can be less source-faithful, so the
review UI is the correct gate.

If the fallback also refuses and there is still no generated PNG, move the row
back to `pending` with the exact refusal text in `lastError`. Do not mark it
`failed`; this queue intentionally leaves hard cases retryable unless the source
is invalid.

If the source image is an invalid fake JPEG body, mark it `source_invalid`
instead of retrying. Some V2 source assets are tiny text bodies like `404.html`
served as JPEGs.

## Compare UI

Start the local review server:

```bash
pnpm main exec node scripts/image-processing/v2-ahs-image-review/server.mjs
```

Open:

```text
http://127.0.0.1:4310
http://127.0.0.1:4310/gallery
```

## Concurrency

The observed hard subagent limit is around six active agents. Attempts above
that can fail with `agent thread limit reached`. In practice, use three active
subagents as the default.

Recommended pattern:

- Use subagents when parallelism matters.
- Run exactly three active subagent workers by default.
- Close each completed agent promptly.
- Verify every candidate file before updating the DB.
- Do not exceed three active workers. If several finish at once, promote and
  close all of them, then refill only back to three.

The strict three-worker loop is slower than the theoretical max, but it avoids
losing track of completed outputs and keeps the review UI moving steadily.

Starting more than three looked faster briefly, but it made failures harder to
classify, increased duplicate notification noise, and left a higher risk of
`processing` rows without a live agent. Three active workers plus immediate
promotion kept the review UI moving most consistently.

## R2 Import and Cleanup

Local approval does not mean an image is safe to delete. A row in `review` or
`approved` is only importable. It is safe to remove local generated artifacts
only after the image has been uploaded to R2 and a ready production `ImageAsset`
row has been created.

The generated cultivar backfill reads rows from the review DB where
`status IN ('review', 'approved')` and `editedPath IS NOT NULL`. It uploads the
edited image and variants to R2, then writes the production `ImageAsset`.

With limited disk space, run the production import at low concurrency:

```bash
pnpm main env:prod node --input-type=module -e 'process.env.DATABASE_URL = process.env.TURSO_DATABASE_URL; process.env.IMAGE_ASSET_BACKFILL_CONCURRENCY = "1"; process.env.IMAGE_ASSET_BACKFILL_BATCH_SIZE = "50"; process.argv = [process.argv[0], "scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs", "--allow-remote-db", "--limit", "50"]; await import("./scripts/image-assets/backfill-generated-cultivar-images-to-r2.mjs");'
```

Notes:

- `.env.production` may define `TURSO_DATABASE_URL` without `DATABASE_URL`; the
  wrapper above maps it for the backfill script.
- Keep `IMAGE_ASSET_BACKFILL_CONCURRENCY=1` when disk is almost full.
- Record the exact `cultivarReferenceId` values printed as
  `[backfilled-generated-cultivar]`.
- Only delete local files for those exact imported ids.

After successful production import, either refresh the local prod-copy DB and
run `sync.mjs`, or mark the exact imported ids as `imported` in
`review.sqlite`. Do not mark merely approved rows as imported.

Safe cleanup for imported ids may remove:

```text
~/daylily-catalog-image-processing/v2-ahs-image-review/codex-native-candidates/{id}-codex-native.png
~/daylily-catalog-image-processing/v2-ahs-image-review/edited/{id}.png
```

It may also remove a `~/.codex/generated_images/{subagentId}` folder only when
the PNG in that folder byte-matches a candidate/edited file for an imported id.
Do not broadly delete `~/.codex/generated_images`; current unpromoted artifacts
may only exist there.

## Validation Checklist

Before calling a run done:

```sql
SELECT status, COUNT(*)
FROM v2_image_review_queue
GROUP BY status
ORDER BY status;
```

There should be no `pending` or `processing` rows for the drained batch.

Use this exact final audit when draining the whole queue:

```bash
sqlite3 /Users/makon/daylily-catalog-image-processing/v2-ahs-image-review/review.sqlite \
  "select status,count(*) from v2_image_review_queue group by status order by status;
   select '---remaining';
   select id,status,attempts,lastError
   from v2_image_review_queue
   where status in ('pending','processing')
   order by updatedAt;"
```

The `---remaining` section must be empty before calling the generation run
complete.

Confirm Codex-native review count:

```sql
SELECT COUNT(*)
FROM v2_image_review_queue
WHERE status = 'review'
  AND promptVersion = 'codex-native-imagegen-v1-square'
  AND editedPath IS NOT NULL;
```

Finally, refresh the review UI and visually spot-check the newest rows. A
`review` row is generated and importable. If a row is clearly wrong, requeue it
or mark it `rejected` with a reviewer note in `lastError`.

Use **Requeue** for generated images that should be tried again with the current
prompt. The UI moves the row back to `pending` and clears `editedPath`. Use
**Reject** only when the row should be excluded from import instead of retried.
