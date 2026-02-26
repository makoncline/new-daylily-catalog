# Query Performance Notes

This document tracks expensive query patterns, why they exist, and follow-up TODOs.

Do not commit raw profiler outputs (`tests/.tmp/query-profiler/*`). Those are local artifacts.

## Run Snapshot

- Date: `2026-02-26`
- Scenario: strategic profiling e2e (`tests/e2e/query-profiler-strategic.e2e.ts`)
- Reports:
  - `tests/.tmp/query-profiler/e2e-strategic-report.json` (SQL)
  - `tests/.tmp/query-profiler/e2e-strategic-report-operation.json` (operation)
- Totals:
  - SQL: `343` events, `86` unique patterns, `1387ms`
  - Operation: `313` events, `27` unique patterns, `4289.83ms`
- Data-shape note (local prod snapshot):
  - User `3` (`rollingoaksdaylilies`) has `1624` listings, `1621` distinct `cultivarReferenceId`.

## Query Notes

| Area | Query Pattern | Purpose | Metrics (2026-02-26 strategic) | Code | Notes | TODO |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard DB bootstrap/sync | `CultivarReference.findMany(...where.id|where.updatedAt)` (`5185c6234f79`) | Keep dashboard cultivar reference cache synced to listing-linked cultivars | `count=11`, `total=1473.08ms`, `avg=133.92ms`, `p95=266.60ms`, `max=266.60ms` | `src/server/api/routers/dashboard-db/cultivar-reference.ts`, `src/app/dashboard/_lib/dashboard-db/cultivar-references-collection.ts`, `src/app/dashboard/_components/dashboard-db-provider.tsx` | Biggest operation cost cluster in strategic run. SQL shows large `IN (...)` batches near SQLite variable limits (`999` + `622`) due account size. | Keep behavior, but reduce repeated full-seed style calls during dashboard session bootstrap/revalidate; investigate sharing/hoisting the listing->cultivar id set per cycle. |
| Dashboard DB bootstrap/sync | `Listing.findMany(select.cultivarReferenceId|where.cultivarReferenceId|where.userId)` (`15aea4078e65`) | Build unique cultivar id list from user listings | `count=12`, `total=173.97ms`, `avg=14.50ms`, `p95=66.84ms` | `src/server/api/routers/dashboard-db/cultivar-reference.ts` | Helper query repeated around sync/seed flow and compounds with cultivar reference fetch. | Consider single-pass bootstrap contract that returns listing rows + cultivar refs from one coordinated server query path. |
| Public search (`/[userSlugOrId]/search`) | `$queryRaw` listing id sort + repeated `Listing.findMany(where.id in ...)` (`9ddd71ce8c94`, `910a4201baa2`) | Client search/filter UX currently loads listing data client-side | `queryRaw: count=10 total=120.89ms`; `Listing.findMany by ids: count=9 total=388.25ms` | `src/components/public-catalog-search/public-catalog-search-client.tsx`, `src/lib/public-catalog-search-persistence.ts`, `src/server/db/getPublicListings.ts` | Query limit is `500`, client auto-fetches all pages, and each page call recomputes sorted ids before slicing. This is an expected product behavior today, but a strong row-read multiplier. | Move `/search` to server-side filtering/pagination and stop client fetch-all pattern. Tracked in GitHub issue (linked below). |
| Pro-user visibility derivation | `KeyValue.findUnique(where.key)` (`8c15d3c60622`) | Resolve per-customer subscription state for pro visibility | `count=158`, `total=695.91ms`, `avg=4.40ms`, `p95=8.13ms`, `max=10.30ms` | `src/server/db/getCachedProUserIds.ts`, `src/server/db/getProUserIdSet.ts`, `src/server/stripe/sync-subscription.ts`, `src/server/db/kvStore.ts` | N+1 read pattern (`stripe:customer:*` keys) under cache-bypassed profiling mode; still a useful optimization target. | Evaluate bulk KV read path (`findMany where key in (...)`) or denormalized subscription status on `User` to avoid per-user key lookups. |
| Public profile lookup | `UserProfile.findFirst(where.slug)` (`b5053a7c4dad`) | Resolve slug -> user id | `count=14`, `total=124.91ms`, `avg=8.92ms`, `p95=52.92ms` | `src/server/db/getPublicProfile.ts` | Moderate overhead; not primary hotspot. | Keep monitoring; optimize only if it grows with traffic. |

## Open Issue

- [#108](https://github.com/makoncline/new-daylily-catalog/issues/108): Move `/{userSlugOrId}/search` from client fetch-all filtering to server-side search/filter/pagination.

## Notes For Future Runs

- Keep this file as the durable query inventory.
- Append new runs with:
  - scenario used
  - key patterns and metric deltas
  - whether changes improved `count`, `p95`, and total time for targeted patterns
