# Revalidation System

## Current Status (2026-02-20)

Automatic public-route revalidation on dashboard mutations is temporarily
disabled.

- Helper: `src/server/cache/revalidate-public-catalog-routes.ts`
- Flag: `ENABLE_PUBLIC_ROUTE_REVALIDATION = false`
- Result: dashboard mutations no longer call `revalidatePath(...)` in practice.

Manual revalidation is still available from the admin menu.

- Open admin menu with `Cmd+Option+X` (macOS) or `Ctrl+Alt+X`.
- Action: **Revalidate current page**
- API route: `src/app/api/admin/revalidate-path/route.ts`

## Why Disabled

Revalidating on every mutation can be noisy and expensive, especially when users
perform many edits in a short time.

## Planned System: Debounced + Deduplicated Queue

Goal: batch many mutation events into fewer revalidations.

### Storage

Use `KeyValue` table entries with a prefix, for example:

- Key: `revalidate:path:<encodedPath>`
- Value JSON:
  - `path`
  - `runAfterIso`
  - `updatedAtIso`
  - `attempts` (optional)

### Enqueue (on mutation)

- `upsert` queue key for each affected path
- set `runAfterIso = now + debounceWindow`
- suggested debounce windows:
  - hourly workflow: `1 hour`
  - daily workflow: `24 hours`

This gives dedupe + debounce naturally because each path key is unique.

### Processor (scheduled)

- run on schedule
- scan queue keys by prefix
- revalidate only items with `runAfterIso <= now`
- on success: delete key
- on failure: update attempts and push `runAfterIso` forward

### Scheduling (free options)

- Vercel Hobby cron: daily cadence
- GitHub Actions scheduled workflow: hourly cadence

## Safety Notes

- Never use in-memory debounce for this on serverless; it is not durable.
- Keep manual admin revalidation for urgent cache refreshes.
- Scope queue entries to exact paths when possible to avoid broad invalidation.
