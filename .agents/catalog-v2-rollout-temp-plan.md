# Catalog V2 Rollout Plan (Temp)

Last updated: 2026-02-17
Path: `.agents/catalog-v2-rollout-temp-plan.md`

## Goal
- Keep all user listings crawlable.
- Keep pages fast for real users.
- Keep hosting/serving costs low on Vercel.
- Keep implementation simple and testable at each step.

## Test Gate (Run Before and After Every Chunk)

```bash
# Fast integration gate
pnpm test -- tests/get-public-catalog-v2.test.ts tests/catalog-v2-url-state.test.ts

# Page behavior gate (attach mode against running local server)
BASE_URL=http://localhost:3000 pnpm test:e2e:attach -- tests/e2e/catalog-v2-page.e2e.ts
```

If a chunk fails the after-tests, revert/fix before starting the next chunk.

## Chunks

### Chunk 1: Add stable page smoke e2e harness
- Add: `tests/e2e/catalog-v2-page.e2e.ts`
- Cover:
  - base page load
  - `?page=2`
  - search param update
  - list filter update
  - for-sale update
  - refresh persistence
- Gate: run full before/after test gate.

### Chunk 2: Finalize SEO URL contract
- Update:
  - `src/app/(public)/catalog-v2/[profileSlug]/_seo/metadata.ts`
  - `src/middleware.ts`
- Rules:
  - only `page` variants indexable/canonical
  - non-page params -> `noindex,follow`
- Add test: `tests/catalog-v2-metadata.test.ts`
- Gate: before/after + metadata test.

### Chunk 3: Simplify static pagination generation
- Update:
  - `src/app/(public)/catalog-v2/[profileSlug]/_lib/catalog-v2-route.ts`
  - `src/app/sitemap.ts`
- Behavior:
  - prebuild first N pages per profile
  - deep pages rely on ISR/on-demand generation
  - sitemap still includes all paginated URLs
- Add test: `tests/catalog-v2-static-params.test.ts`
- Gate: before/after + static params test.

### Chunk 4: Add CDN index endpoints (manifest + chunks)
- Add route handlers under:
  - `src/app/(public)/catalog-v2-index/[profileSlug]/manifest/route.ts`
  - `src/app/(public)/catalog-v2-index/[profileSlug]/chunk/[chunk]/route.ts`
- Behavior:
  - static/ISR responses
  - versioned manifest/chunks
  - profile-scoped cache tags
- Add test: `tests/catalog-v2-index-routes.test.ts`
- Gate: before/after + index route tests.

### Chunk 5: Switch client index loading to CDN chunks
- Update:
  - `src/app/(public)/catalog-v2/[profileSlug]/_components/catalog-v2-client.tsx`
- Behavior:
  - fetch manifest/chunks from CDN endpoints
  - keep server fallback for large catalogs (`> 2000`)
  - keep existing URL-state semantics
- Gate: before/after test gate.

### Chunk 6: Add on-demand profile-scoped revalidation
- Add helper:
  - `src/server/cache/revalidate-catalog-v2.ts`
- Call helper from listing/list/profile mutations that affect public catalog output.
- Invalidate:
  - page paths
  - index tags/paths
- Add test: `tests/revalidate-catalog-v2.test.ts`
- Gate: before/after + revalidate test.

### Chunk 7: Final payload/perf cleanup
- Optimize:
  - listing card payload size
  - image loading/sizing
  - above-the-fold JS/data footprint
- Gate: before/after, plus:
  - `pnpm lint`
  - `npx tsc --noEmit`

## Notes
- Preserve existing `/{userSlugOrId}` behavior during V2 rollout.
- Keep `?page=` user-facing URL format.
- Preserve canonicalization/robots behavior for search/filter params.

