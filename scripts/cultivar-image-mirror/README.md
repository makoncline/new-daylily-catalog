# Cultivar Image Mirror + Grok Edit Flow

This directory contains scripts to:

1. Seed a tracking DB with cultivar image rows.
2. Download original images and update DB progress.
3. Run Grok image edits in resumable paid batches (only once per row unless failed).
4. Generate and serve a simple side-by-side HTML table (`original | edited`).

All runtime artifacts are written to:

- `/Users/makon/dev/apps/new-daylily-catalog/scripts/cultivar-image-mirror/output`

## Prereqs

- `sqlite3`
- `python3`
- Node environment already used in this repo (`npx tsx ...`)
- For edit runs only: `XAI_API_KEY`

## 1) Seed DB With Cultivar Rows (No Downloads)

```bash
cd /Users/makon/dev/apps/new-daylily-catalog
npx tsx scripts/cultivar-image-mirror/download-cultivar-images.ts --seed-only
```

Optional:

- Add `--include-placeholders` to include placeholder rows.
- Add `--limit N` to seed a smaller subset for testing.

## 2) Download Images And Update DB

```bash
cd /Users/makon/dev/apps/new-daylily-catalog
npx tsx scripts/cultivar-image-mirror/download-cultivar-images.ts --max-in-flight 10 --retries 3
```

Notes:

- Safe to rerun. Already downloaded rows are skipped.
- Progress is persisted in `cultivar_images` table (`status`, `attempt_count`, `error`, etc.).

## 3) Run Grok Edits In Paid Batches (Only Once)

```bash
cd /Users/makon/dev/apps/new-daylily-catalog
export XAI_API_KEY='YOUR_KEY_HERE'
npx tsx scripts/cultivar-image-mirror/run-grok-edits.ts \
  --prompt "Your edit prompt here" \
  --limit 50 \
  --max-in-flight 2 \
  --retries 2
```

Notes:

- `--limit` controls batch size.
- Reruns do not re-edit completed rows (`edit_status='edited'` + `edited_relative_path` present).
- Failed rows remain marked `edit_status='failed'` with `edit_error`.

## 4) Generate + Serve Viewer In One Command

```bash
cd /Users/makon/dev/apps/new-daylily-catalog
bash scripts/cultivar-image-mirror/serve-compare-viewer.sh
```

This command:

- Regenerates `output/viewer/index.html`
- Starts `python3 -m http.server` in `output/`
- Opens `http://localhost:8787/viewer/index.html` automatically on macOS

## Useful DB Checks

```bash
sqlite3 scripts/cultivar-image-mirror/output/cultivar-images.sqlite "SELECT status, COUNT(*) FROM cultivar_images GROUP BY status;"
sqlite3 scripts/cultivar-image-mirror/output/cultivar-images.sqlite "SELECT edit_status, COUNT(*) FROM cultivar_images GROUP BY edit_status;"
sqlite3 scripts/cultivar-image-mirror/output/cultivar-images.sqlite "SELECT id, edit_error FROM cultivar_images WHERE edit_status='failed' LIMIT 20;"
```
