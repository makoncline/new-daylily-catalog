---
name: v2-ahs-update-review
description: Review V2 AHS cultivar refresh update deltas before applying them. Use when deciding whether changed cultivar data is an improvement, a regression risk, or needs human review, especially for image_url, images_count, names, hybridizers, parentage, awards, and non-empty-to-empty field changes.
---

# V2 AHS Update Review

Use this skill after generating a V2 AHS refresh delta and before preparing or applying update SQL.

Default stance:
- do not assume new source data is automatically better
- do not hard-code filtering rules unless the user explicitly asks
- classify updates through review and discussion with the user
- split safe updates from human-review updates when preparing SQL

## Inputs

Prefer these local artifacts when available:
- `prisma/data-migrations/v2-ahs-cultivar-delta/summary.json`
- `downloads/v2-ahs-refresh-review/index.html`
- `prisma/local-prod-copy-daylily-catalog.db`
- the fresh source DB used by the summary, usually `cultivars.db` or `cultivars-*.db`

Use the existing review UI when the user wants visual comparison. Use direct SQLite queries when the user wants counts, examples, or field-specific audits.

## Review Goal

For each changed row or changed field, decide one of:

- `safe`: the new value is clearly more complete, corrected, or equivalent-but-normalized
- `human_review`: the change may be valid but could remove useful information or alter meaning
- `preserve_old`: the new value is likely worse than the existing production value

Treat the user as the final decision maker. Present evidence and recommendations, then refine criteria through conversation.

## Regression Signals

Flag for `human_review` when:
- `image_url` changes from a real URL to null, empty, placeholder, broken, or obviously lower-value data
- `images_count` decreases, especially from positive to zero/null
- a non-empty field becomes null, empty, `[]`, or less specific
- an existing award list becomes empty or loses awards
- parentage, seedling number, color, measurements, bloom traits, or hybridizer data is removed
- `post_status` moves away from `publish`
- `post_title` or `link_normalized_name` changes in a way that could break matching or public URLs
- hybridizer id and name stop agreeing with each other
- numeric values change in implausible ways, such as bloom size or scape height dropping sharply without other evidence

Flag for `preserve_old` when the new value is clearly worse, for example:
- source image is missing but production has a useful image
- a detailed description is replaced with a vague fragment
- a structured value is replaced by malformed text
- new source value appears to be a scrape artifact or placeholder

## Improvement Signals

Usually classify as `safe` when:
- old value is null/empty and new value is populated
- source fixes spelling, punctuation, quote normalization, or capitalization without changing identity
- trait names become more standardized while ids still match the meaning
- new value adds specificity without deleting existing useful information
- image_url changes from missing/placeholder to a real source image
- `last_updated` changes only as part of an otherwise approved row

Do not treat `last_updated` alone as an improvement.

## Review Workflow

1. Start with a short status summary: total new rows, changed rows, and the biggest changed fields.
2. Sample high-risk changes first: images, non-empty-to-empty changes, name/title changes, awards, parentage, and hybridizer changes.
3. Propose a working policy in plain language, then let the user adjust it.
4. Keep a running split of `safe`, `human_review`, and `preserve_old` decisions.
5. When preparing SQL, put `safe` updates in one batch and `human_review` updates in a separate batch.
6. Never apply to Turso unless the user explicitly asks.

## Output Style

Use concise review tables or grouped bullets.

For review candidates, include:
- cultivar id
- title
- changed field
- old value
- new value
- recommended classification
- reason

For final handoff, include:
- safe update count
- human-review count
- preserve-old count
- exact SQL files or next commands, if generated
