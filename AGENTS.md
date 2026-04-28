# Agents

- [2026-04-28] Monorepo app root: The current all-in-one app lives in `apps/main` as package `@daylily-catalog/main`; root `pnpm <task>` scripts route through Turbo and `pnpm main <task>` forwards directly to the app workspace. When updating app paths, Prisma scripts, Playwright artifacts, or Vercel settings, treat `apps/main` as the app cwd and keep root files limited to workspace orchestration.
- [2026-04-27] Dashboard full bootstrap must split Vercel work: A single heavy server snapshot endpoint can exceed Vercel's 10s function limit for the largest catalog even after local query optimization. Cold bootstrap and warm full refresh should fetch lightweight `dashboardDb.bootstrap.roots`, then separately fetch unbatched listing-image and cultivar-reference chunks before applying one combined local snapshot; add route-specific cursor/chunking only if an individual route still times out.
- [2026-04-28] Query profiler bypasses server caches: `LOCAL_QUERY_PROFILER=1` makes `createServerCache()` call through directly, so direct Vitest/import probes can overstate repeated calls to cached helpers like `getCachedProUserIds()`. When investigating public-page N+1 alerts, use profiler output to find intra-helper fan-out, but validate route-level cache behavior with a real Next request before assuming production repeats every cached helper call.
- [2026-04-27] Prod-readonly dashboard smoke workflow: Local SQLite can miss Turso/Vercel timeout risk. When dashboard read-path timing needs production-shape feedback before PR/deploy, follow `docs/prod-readonly-dashboard-smoke.md`: pull env into an ignored file, run local code against production Turso read-only, and access it through a Cloudflare-tunneled `daylilycatalog.com` subdomain so production Clerk auth works.
- [2026-04-28] TanStack query-db peer pin: `@tanstack/query-db-collection@0.2.15` is not compatible with `@tanstack/query-core@5.100.x` in the dashboard collection layer; it throws `query.isFetched is not a function` and duplicate sync document errors. When updating data-fetching libs here, keep `@tanstack/query-core` pinned to `5.86.0` unless also doing the `query-db-collection` major upgrade and dashboard collection fixes.
- [2026-04-28] Dashboard chunk grouping beats interleaving: Against prod Turso through the local tunnel, interleaving image chunks with cultivar-reference chunks made both endpoints slower even with shared concurrency 2. For large dashboard cold loads, keep heavy chunks grouped by endpoint, avoid full `Image` scans, and tune chunk size before trying mixed scheduling.
- [2026-04-28] Dashboard load failure alerts are best-effort: The dashboard bootstrap failure path reports to Sentry and calls `https://send-to-makon.vercel.app/api/send-telegram` as a no-cors GET. When touching this alerting, keep both paths fire-and-forget and swallow failures so monitoring outages never block the dashboard error UI.
- [2026-04-27] Dashboard Turso cold-load contention: Against prod Turso, dashboard bootstrap image/cultivar-reference chunks got slower under wide parallelism (raw-query chunks reached ~18-23s) but stayed below ~7.5s with a single shared two-request scheduler. When tuning dashboard cold loads, keep heavy chunk requests unbatched and globally throttled instead of giving each resource its own parallel queue.
- [2026-04-12] Cultivar route codec is reversible: Public cultivar URLs now encode `CultivarReference.normalizedName` exactly with spaces as `-` and every other non-alphanumeric character as `~hh` byte escapes. When touching cultivar links, sitemap entries, or public cultivar lookup, use `toCultivarRouteSegment` / `fromCultivarRouteSegment` and do not reintroduce slugify-style fallbacks or candidate guessing.
- [2026-04-27] Dashboard sync must stay unbatched: Cold dashboard bootstrap can fire four heavy `dashboardDb.*.sync` calls at once, and batching them into one `/api/trpc` request can make a single Vercel function wait past the 10s limit. When changing `src/trpc/client-links.ts` or dashboard bootstrap networking, keep those sync procedures on the unbatched `httpLink` path unless the server work is made cheap enough for one invocation.
- [2026-04-27] Sentry helper global args: The local Sentry skill script expects `--org` and `--project` before the subcommand, for example `python3 "$HOME/.codex/skills/sentry/scripts/sentry_api.py" --org makon-dev --project new-daylily-catalog list-issues ...`. When checking plugin auth here, do not put those flags after `list-issues`.
- [2026-04-27] Dashboard sync should avoid relation filters: On Vercel/Turso, unbatched `dashboardDb.cultivarReference.sync` and `dashboardDb.image.sync` still timed out when they filtered through Prisma relations like `listing.userId` / `userProfile.userId` or did a second broad cultivar-reference lookup. For dashboard bootstrap queries, first resolve owner rows via indexed `Listing.userId` / `UserProfile.userId`, then query by direct foreign keys such as `listingId`, `userProfileId`, or selected nested `cultivarReference`.
- [2026-04-11] V2 display seam coverage: Public cultivar pages, public listing cards/details, and dashboard cultivar reads all inherit V2 display name and hybridizer fields from `src/lib/utils/ahs-display.ts` via `withResolvedDisplayAhsListing` / `getDisplayAhsListing`. When fixing V2 UI fallback text here, patch that shared mapper first and only touch `src/server/db/public-cultivar-sections.ts` separately if query behavior like related-by-hybridizer must change.
- [2026-04-11] Repo lint scope is src-only: `pnpm lint` runs `eslint src` in this repo. Ad hoc ESLint runs against `tests/**` currently surface pre-existing unsafe-any findings that are not part of the enforced lint command, so use `pnpm lint` for the real lint gate and rely on targeted tests plus `npx tsc --noEmit` for test-file verification.
- [2026-04-10] Local scratch roots stay ignored: In this repo, top-level `/downloads/` and `/local/` are operator scratch areas for image-review outputs, browser profiles, temp DBs, and other local-only tooling. When adding more local workflow files here, keep them under those roots and leave the roots gitignored so binary/log churn does not explode `git status`.
- [2026-04-10] Track image-review code under scripts, not local: The V2 image-review scripts, HTML UI, and helper docs now live in `scripts/image-processing/v2-ahs-image-review/`. Keep only runtime state under ignored `local/v2-ahs-image-review/` and `downloads/v2-ahs-image-review/`. When adding or fixing this workflow, edit the tracked `scripts/` copy and treat `local/` as scratch only.
- [2026-04-10] Local model path retired from tracked image-review tooling: The old FLUX/mflux watermark-removal worker and mask helper were removed from `scripts/image-processing/v2-ahs-image-review/`. For this repo’s tracked image-review flow, assume the supported path is ChatGPT generation plus the local review UI; treat any remaining FLUX/Xcode/venv artifacts under ignored `local/` as disposable scratch.
- [2026-03-19] Dashboard delete/full-refresh race: Dashboard collection full-refresh paths replace query data wholesale. If a delete mutation is still in flight, a `sync({ since: null })` refresh must filter local tombstoned ids or stale rows can reappear. Clear those tombstones during explicit collection cleanup/logout reset, not during refresh.
- [2026-04-28] Dashboard chunk endpoints are POST-backed reads: The bootstrap leaf endpoints pass large ID arrays and this app does not currently configure tRPC method override, so keep them as read-only `.mutation` procedures unless POST query transport is added first. Moving them to normal queries would risk huge GET URLs on large catalogs.
- [2026-03-19] Dashboard refresh user ownership: Keep `setCurrentUserId(userId)` at the top-level dashboard bootstrap/revalidate entrypoints, not inside per-collection refresh helpers. Otherwise a queued background refresh can restore the old user context after logout and fire extra syncs.
- [2026-03-19] Dashboard refresh simplicity rule: Prefer one dashboard-wide refresh lock over per-collection mutation guards. Cold bootstrap blocks on the full load, warm bootstrap hydrates first then runs one full refresh, and dashboard mutations wait for that lock before applying optimistic changes.
- [2026-03-19] Warm dashboard hydrate still needs awaited profile prefetch: If `DashboardDbProvider` marks the dashboard ready immediately after snapshot hydration and only fires `dashboardDb.userProfile.get.prefetch()` in the background, warm `/dashboard` and `/dashboard/profile` loads can flash uncached profile fallbacks. Keep the ready transition behind the profile prefetch, matching cold bootstrap.
- [2026-03-19] Queued dashboard refreshes need auth-generation guards: A fire-and-forget `revalidateDashboardDbInBackground(oldUserId)` can outlive logout/account-switch cleanup. If it later restores `setCurrentUserId(oldUserId)`, full-refresh helpers can repopulate `["dashboard-db", ...]` cache entries for the old account. Guard stale queued refresh/bootstraps before restoring `currentUserId`.
- [2026-03-19] Dashboard queued refresh ownership lives with the provider effect: `getCurrentUserId()` alone is not enough to reject queued warm refreshes after logout because the app-user query can lag Clerk auth changes. Pass a simple provider-scoped `isActive()` callback into bootstrap/revalidate work and abort queued callbacks once the owning `DashboardDbProvider` effect is cancelled or replaced.
- [2026-03-19] Dropped dashboard lock work must reject, not return fake values: If `runWithDashboardRefreshLock()` discards queued work after an auth-generation reset, reject with a real cancellation error. Returning `undefined as T` breaks mutation return contracts in callers like create dialogs that immediately read `.id` or `.title`. Bootstrap/revalidate helpers can catch that cancellation and turn it into a no-op, but mutation helpers should still reject.
- [2026-03-19] Cancelled warm dashboard revalidates need stale-only invalidation plus cursor reset: If a warm snapshot hydrate sets skip-next-sync flags and the background full refresh aborts, clear those skip flags and the per-user dashboard cursors, then invalidate the collection queries with `refetchType: "none"`. That makes the next collection load do a true full sync without triggering immediate stale background refetches.
- [2026-03-19] Dashboard refresh lock needs cancellation-aware queued work: A global `runWithDashboardRefreshLock()` serializes refreshes and mutations, but queued callbacks still wait for older work to settle and then run unless they re-check ownership. On logout/account switch, stale queued dashboard work can block the next bootstrap or execute against the wrong session. Future agents should add a user/auth-generation guard after the lock wait and before any queued mutation/bootstrap work starts.
- [2026-03-19] Simplest dashboard auth-transition fix is a hard reload: `AuthHandler` is only mounted inside the dashboard client wrapper. When Clerk `userId` changes there, prefer `window.location.reload()` over trying to preserve dashboard SPA state across users. That tears down in-flight dashboard queries/mutations with the page instead of adding more cross-user cache guards.
- [2026-04-10] Dashboard bootstrap helper must mirror provider ownership guards: `bootstrapDashboardDbForUser()` can drift from `DashboardDbProvider` because the provider now bootstraps inline. If this helper is kept, set `currentUserId` before cold collection initialization and pass the optional `isActive` guard into warm `revalidateDashboardDbInBackground()` calls, or cold bootstrap tests can pass while helper-driven flows still no-op or leak stale warm refreshes.
- [2026-04-09] Full Vitest verify should run alone: Running `pnpm test` in parallel with another heavy command like `pnpm lint` can make `tests/stripe-router.integration.test.ts` time out and leave misleading mock-call failures even though the file and the full suite pass when Vitest runs by itself. When verifying this repo after broad changes, run the full unit suite sequentially.
- [2026-03-28] Sentry env bootstrap: This repo's `.env.development` can contain an active `SENTRY_AUTH_TOKEN` while `SENTRY_ORG` and `SENTRY_PROJECT` are only commented hints. When using the Sentry skill here, source `.env.development` for the token and pass `--org makon-dev --project new-daylily-catalog` explicitly. If the API still returns HTTP 403, the local token is stale or lacks `project:read`/`event:read` and must be refreshed before issue triage will work.
- [2026-04-03] Daylily Database image fallback: `https://www.daylilydatabase.org/...` currently fails TLS verification because the cert expired on 2026-03-28, while the same image paths still respond over plain `http://`. When remote cultivar images break in the browser, do not try a client-side bypass; proxy or mirror the image through this app's own HTTPS origin instead.
- [2026-04-08] V2 cultivar refresh skill: The repo-local workflow for fetching daylilies.org pages, combining them into `cultivars.db`, generating V2 delta SQL against `prisma/local-prod-copy-daylily-catalog.db`, rehearsing locally, and only then applying to Turso lives in `.codex/skills/v2-ahs-refresh/SKILL.md`. When asked to refresh V2 cultivar data, read that skill first. Use the local prod copy by default and only touch Turso when the user explicitly asks.
- [2026-04-08] Reviewable data SQL should stay one statement per line: For manual daylily data refresh and cleanup migrations, generated SQL is easier to review and rerun when it uses a short header plus one literal `INSERT`/`UPDATE`/`DELETE` statement per line, without per-row annotation comments. When generating repo-local data-migration artifacts here, prefer compact statement-only SQL.
- [2026-04-08] Local DB first for analysis: In this repo, prefer querying `/Users/makon/dev/new-daylily-catalog/prisma/local-prod-copy-daylily-catalog.db` for ad hoc data analysis and investigation. Only use live Turso commands when the user explicitly asks for them or when validating a migration against a remote DB.
- [2026-04-08] Turso large SQL import transport limit: Streaming the full generated V2 cultivar upsert SQL (~59 MB) through `turso db shell < ...` failed repeatedly with `stream not found` on this machine and Turso setup. For this repo, generate the V2 import as chunk files under `prisma/data-migrations/20260407_upsert_v2_ahs_cultivars/` and apply them with `npx tsx scripts/apply-v2-ahs-cultivar-import.ts --db <name>` instead of sending one giant SQL file.
- [2026-04-07] Cultivar normalizedName is app-facing: `CultivarReference.normalizedName` is used in public cultivar lookup, route generation, and dashboard cultivar search helpers. When changing its normalization semantics, treat it as a real data-model and routing migration, not dead-column cleanup, and check for duplicate-name conflicts first.
- [2026-04-07] CultivarReference cleanup dependencies: In the current prod-schema snapshot, the only real foreign-key dependency on `CultivarReference` is `Listing.cultivarReferenceId`, and every `CultivarReference` row already has a valid `ahsId` with a nonblank `AhsListing.name`. When writing SQL dedupe/rename migrations for cultivar references, repoint `Listing` and derive canonical normalized names directly from `AhsListing.name`.
- [2026-04-07] Large inline SQLite verify CTEs get expensive fast: For the cultivar-reference normalization cleanup, repeating a ~7.8k-row inline `VALUES` target set across multiple verification queries made local SQLite runs much slower. When shipping literal SQL migrations in this repo, keep verification to one compact union query of core counts unless you truly need the extra debug result sets.
- [2026-04-07] Canonical cultivar normalization should be stricter than raw names but narrower than search matching: On the current prod snapshot, folding Unicode quote/dash variants, accents, and whitespace while preserving apostrophes/hyphens only changes 660 `CultivarReference.normalizedName` rows and creates 1 duplicate loser, while removing apostrophes jumps to ~7.8k changes and extra false-merge conflicts. For stored canonical cultivar ids in this repo, prefer the preserve-apostrophes form; keep apostrophe-stripping only in looser search helpers.
- [2026-04-07] Prod-shaped SQLite schema rollout: `prisma db push` against the current prod-shaped SQLite copy can partially mutate schema before failing on the existing partial index `Listing_public_cultivarReferenceId_updatedAt_idx`. When adding schema to the real catalog DB, prefer reviewed additive SQL files plus verification queries instead of relying on `db push` against the live-shaped database.
- [2026-04-07] pnpm script arg separator: `pnpm <script> -- --flag` forwards the literal `--` into `process.argv`. When adding custom script arg parsers in this repo, ignore the separator explicitly or standard dry-run/limit invocations will fail.
- [2026-04-07] Prisma diff and partial indexes: `prisma migrate diff` on this schema emits a non-partial recreate of `Listing_public_cultivarReferenceId_updatedAt_idx` because partial indexes are not representable in `schema.prisma`. When generating structural SQL for this repo, review migration artifacts for that spurious index create and remove it before applying to an existing database.

This file is for agentic coding tools working in this repo. Follow the rules
below and mirror existing conventions before introducing new ones.

## Quick Commands

- Package manager: `pnpm` (see `package.json`)
- Install: `pnpm install`
- Dev server: `pnpm dev` or `pnpm main dev`
- Build: `pnpm build` or `pnpm main build`
- Start: `pnpm start` or `pnpm main start`
- Lint: `pnpm lint` or `pnpm main lint`
- Typecheck: `pnpm typecheck` or `pnpm main typecheck`
- Unit tests: `pnpm test` or `pnpm main test`
- Unit tests (watch): `pnpm test:watch` or `pnpm main test:watch`
- E2E tests: `pnpm test:e2e` or `pnpm main test:e2e`
- E2E tests (attach to existing server): `pnpm test:e2e:attach` or `pnpm main test:e2e:attach`
- Query profiler (single command session): `DATABASE_URL="file:/absolute/path/to/apps/main/prisma/local-prod-copy-daylily-catalog.db" pnpm env:dev pnpm profile:queries`

For query profiling workflow details, always start with `apps/main/docs/local-query-profiler.md`.

### Run a Single Test

- Vitest by file: `pnpm main test -- tests/some-file.test.ts`
- Vitest by test name: `pnpm test -- -t "test name"`
- Vitest watch by file: `pnpm main test:watch -- tests/some-file.test.ts`
- Playwright by file: `pnpm main test:e2e -- tests/some-file.e2e.ts`
- Playwright by title/grep: `pnpm test:e2e -- --grep "checkout flow"`

## Temp DB Workflow (Local UI + E2E)

```sh
# Create a fresh temp DB
pnpm main exec tsx scripts/create-temp-db.ts

# Seed example data (optional)
pnpm main exec tsx scripts/seed-temp-db-example.ts

# Run app against the temp DB
DATABASE_URL="file:/absolute/path/to/apps/main/tests/.tmp/ui-listings.sqlite" pnpm dev
```

Custom DB path:

```sh
pnpm main exec tsx scripts/create-temp-db.ts --db tests/.tmp/custom-temp.sqlite
pnpm main exec tsx scripts/seed-temp-db-example.ts --db tests/.tmp/custom-temp.sqlite
DATABASE_URL="file:/absolute/path/to/apps/main/tests/.tmp/custom-temp.sqlite" pnpm dev
```

Note: `scripts/seed-temp-db-example.ts` is minimal; write a purpose-built
seed script for e2e, QA, or demos.

Playwright local runs auto-provision a temp DB and start `pnpm dev` unless
`BASE_URL` is set. Local E2E uses `E2E_PORT` (default `3100`).

## Local "Prod" Build Workflow (with Production Data Snapshot)

Use this when you need production-mode behavior locally with a local copy of
production data.

```sh
# Pull local copy of prod DB to file
pnpm main env:dev bash scripts/db-backup.sh

# Build in production mode against local prod DB copy
DATABASE_URL="file:/absolute/path/to/apps/main/prisma/local-prod-copy-daylily-catalog.db" NODE_ENV=production pnpm env:dev pnpm build

# Run production server locally against local prod DB copy
DATABASE_URL="file:/absolute/path/to/apps/main/prisma/local-prod-copy-daylily-catalog.db" NODE_ENV=production pnpm env:dev pnpm start
```

## Approximate Data Scale (for query work)

Use these as order-of-magnitude expectations when evaluating query behavior:

- `AhsListing`: ~100,000 rows
- `CultivarReference`: ~100,000 rows
- `User`: ~100 rows
- `Listing`: ~5,000 rows
- `Image`: hundreds of rows (varies)

## Static Public Pages + Search Params

For SEO-focused public routes, keep the server render static and treat query
params as client-only UI state.

- Public SEO pages should render as static/ISR (not request-time dynamic).
- Do not read `searchParams` in server `page.tsx`, `layout.tsx`, or
  `generateMetadata` for static public routes.
- Canonical URLs should be query-free (base path only).
- Parse and apply query params in client components only (for sort/filter/toggle
  UX via `useSearchParams` + `router.replace`).
- Query params should not change server data fetching, metadata, or structured
  data for static public pages.
- For routes that should only serve build-known slugs, use
  `dynamic = "force-static"` and `dynamicParams = false`.
- Verify behavior with the local prod workflow and check headers for static
  pages (`x-nextjs-cache: HIT` and `Cache-Control: s-maxage=...`).

## Repo Structure (High-Level)

- `apps/main/src/app/` Next.js App Router (routes + route-level `_components`)
- `apps/main/src/components/` shared components (`ui/` is shadcn-only)
- `apps/main/src/server/` server-side logic (tRPC, db, stripe, clerk)
- `apps/main/src/types/` shared types and zod schemas
- `apps/main/prisma/` Prisma schema and migrations (do not generate migrations)
- `apps/main/tests/` unit and e2e tests

## Cursor Rules (from `.cursorrules`)

- Use specification and guidelines as you build the app
- Write complete code for every step
- Use `<ai_context>` tags in code as context clues
- Use `@` alias for app imports
- Use kebab-case for files/folders
- Do not update shadcn components unless asked
- Env: update `.env.example` when env vars change
- Env: use `.env.development`; avoid exposing server-only vars
- Env: use `NEXT_PUBLIC_` for client-exposed vars
- Env: import via `import { env } from "@/env"`
- Types: put types in `src/types/` and export via `src/types/index.ts`
- Types: name type files `example-types.ts`
- Types: prefer interfaces over type aliases
- Types: use zod + `z.infer<typeof schema>`
- Types: db types from `@prisma/client`
- Frontend: use `lucide-react` for icons
- Frontend: use `div` unless specified otherwise
- Frontend: add blank lines between main DOM sections
- Frontend: every component/page/layout must include `"use server"` or
  `"use client"` at top
- Frontend: server components fetch data and pass to client props
- Frontend: use `@/trpc/server` for mutations
- Backend: do not generate migrations; ignore `prisma/migrations`
- Backend: use `user.id` (not Clerk auth id)
- Backend: include `createdAt`/`updatedAt` and cascade deletes when needed
- tRPC: routers in `src/server/api/routers` in CRUD order
- tRPC: return `undefined` when no data should be returned
- Auth: import auth via `@clerk/nextjs/server`

## Code Style Guidelines

### Imports and Module Boundaries

- Use path alias `@/` for app imports (see `tsconfig.json`)
- Prefer type-only imports (`import type { ... }`) per ESLint rules
- Keep `@prisma/client` imports for DB types and client access
- Do not import server components into client components

### Formatting

- Prettier is configured with Tailwind plugin (`prettier-plugin-tailwindcss`)
- Keep Tailwind class order stable (Prettier handles it)
- Use default Next.js/TypeScript formatting; no custom rules beyond lint

### Naming

- Kebab-case for files and folders
- Components: `example-component.tsx`
- Types files: `example-types.ts`
- zod schema files: `example-schemas.ts`

### Types and Validation

- Prefer interfaces, use type aliases only when necessary
- Create zod schemas for validation and derive types via `z.infer`
- Export all shared types from `src/types/index.ts`

### Error Handling

- Wrap tRPC mutations in `try/catch` and throw `TRPCError`
- Log errors with context before throwing
- Return `undefined` from procedures that do not return data

### Frontend Conventions

- Add `"use client"` or `"use server"` at top of every component/page/layout
- Use server components for data fetching; pass results to client props
- Use Suspense for async server components; skip if no async work
- Icons come from `lucide-react`
- `src/components/ui/` is shadcn-only; avoid editing unless requested
- Responsive design default: use only two breakpoint modes for new UI work
  in this repo: base (`< lg`, below 1024px) and `lg` (`>= 1024px`). Avoid
  `sm`/`md`/`xl` unless explicitly requested.

### Backend Conventions

- tRPC routers live in `src/server/api/routers` by domain
- Order procedures: Create, Read, Update, Delete
- Use `@/trpc/server` and `@/trpc/react` for procedure imports
- Do not generate Prisma migrations

### Environment Variables

- Keep env changes synced in `.env.example`
- Store local env in `.env.development`
- Use `NEXT_PUBLIC_` prefix only when needed on the client
- Access env via `import { env } from "@/env"`

## Testing Notes

- Unit tests are `tests/**/*.test.ts(x)` (Vitest, `jsdom`)
- E2E tests are `tests/**/*.e2e.ts(x)` (Playwright)
- Playwright tags: `@local` runs only locally; `@preview` runs only on preview
- Local Playwright runs a dev server and temp DB if `BASE_URL` is not set

## CI Reference

- PR checks run: lint, typecheck, unit tests, and e2e in CI
- E2E CI sets placeholder env vars and uses `pnpm test:e2e`

## Cursor Cloud specific instructions

### Environment

- `.env.development` is created by the VM snapshot with placeholder keys and
  `SKIP_ENV_VALIDATION=1`. The app starts without real Clerk/Stripe/AWS keys
  but auth-dependent flows will not work.
- Prisma client is generated by the `postinstall` hook (`prisma generate`) and
  imported from `@prisma/client`.

### Running the dev server

Use the Temp DB Workflow documented above. The key env vars are:

```sh
DATABASE_URL="file:/absolute/path/to/tests/.tmp/ui-listings.sqlite" \
SKIP_ENV_VALIDATION=1 \
NEXT_PUBLIC_SENTRY_ENABLED=false pnpm dev
```

### Gotchas

- **Turbopack cache corruption**: if the dev server or E2E tests fail with
  `Failed to restore task data (corrupted database or bug)`, delete
  `.next` (`rm -rf .next`) and retry.
- **Next.js dev lock**: if you see `Unable to acquire lock at .next/dev/lock`,
  remove the lock file (`rm -f .next/dev/lock`) before starting the server or
  E2E tests.
- **E2E tests manage their own server**: `pnpm test:e2e` starts a dev server
  on port 3100 and provisions a temp DB automatically. Do not start a separate
  dev server on port 3100 before running E2E tests. Kill any process on port
  3000/3100 before running E2E to avoid conflicts.
- **Lint and typecheck** require `SKIP_ENV_VALIDATION=1` when real env vars are
  not present.
- **Playwright browsers**: Chromium is installed to
  `~/.cache/ms-playwright/chromium-*`; the update script keeps it current.

- [2026-03-19] Brave CDP discovery flake: Local Brave can expose `DevToolsActivePort` while the usual `http://127.0.0.1:<port>/json/list` discovery endpoint still returns 404 or hangs. When browser inspection is needed, do not assume Chrome-style discovery works; fall back to manual verification or another browser session if CDP attachment fails.
- [2026-04-07] Daylily scrape request shape: `scripts/scrape/fetch-pages.sh` cannot use a hardcoded nonce or a bare POST anymore. The working flow is to fetch `cultivar_search_ajax.nonce` from `https://daylilies.org/search/` at run start and send browser-like `Origin`, `Referer`, `X-Requested-With`, and `Accept` headers to `https://daylilies.org/wp-admin/admin-ajax.php`; otherwise the endpoint returns `0` or `-1`.
- [2026-04-07] Daylily scrape image compile rule: The search payload exposes `first_image` plus `images_count`, but the DB should not persist the placeholder asset `cultivar-search-placeholder`. In `scripts/scrape/combine-pages-sqlite.sh`, store only `first_image.full` in `image_url` and coerce placeholder URL/title matches to `NULL` instead of serializing the whole `first_image` object.
- [2026-04-08] Temp DB V2 cleanup: `src/lib/test-utils/e2e-db.ts` must delete from `V2AhsCultivar` during `clearTempDb()`. When additive source tables are added to `schema.prisma`, local temp DB/e2e reseeds will silently keep stale rows unless the cleanup helper is updated too.
- [2026-04-08] Client-shared NEXT_PUBLIC flag helpers: Any module reachable from client components must not import `@/env` just to read a public feature flag. In this repo, read `process.env.NEXT_PUBLIC_*` directly in shared/client-safe helpers or the production client will throw `Attempted to access a server-side environment variable on the client`.
- [2026-04-08] V2 display source must be exclusive: When `NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA` is enabled, the read path should be V2-only, not a merge of V2 plus legacy `AhsListing` fields and not a legacy fallback path. In this repo, use the legacy AHS read path only when the flag is off, and do not carry legacy AHS ids through the display payload.
- [2026-04-08] Flag-on dashboard cultivar lookup ids: With `NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA=true`, `dashboardDb.ahs.search` and `dashboardDb.ahs.get` should key off `CultivarReference.id`, not legacy `ahsId`, so V2-only references remain selectable in create-listing/onboarding flows.
- [2026-04-08] Prisma client after schema expansion: After adding Prisma models or fields that scripts/tests touch, run `npx prisma generate` before linting or typechecking. Otherwise the generated client in `node_modules` still lacks delegates like `db.v2AhsCultivar` and fields like `CultivarReference.v2AhsCultivarId`, even when `schema.prisma` is already correct.
- [2026-04-08] Prisma migration authoring DB: Use a clean local SQLite DB for `prisma migrate dev --create-only` and keep `prisma/local-prod-copy-daylily-catalog.db` only for rehearsal. In this repo, pointing Prisma migration generation at the prod copy causes drift because the real DB has custom SQL like the partial `Listing_public_cultivarReferenceId_updatedAt_idx` that should live only in migration SQL, not `schema.prisma`.
- [2026-04-08] Local DB role split: `prisma/local-dev.sqlite` is the Prisma-managed migration authoring DB, while `prisma/local-dev-seeded.sqlite` is the disposable seeded app DB. When generating migrations, use `local-dev.sqlite`; when running the local seed or syncing the seeded Turso demo DB, use `local-dev-seeded.sqlite`.
- [2026-04-08] Daylily search delta limits: The public `daylilies.org` `cultivar_search` endpoint accepts `registration_year_exact` plus `post_title`/`introduction_date` sorts, but attempts to filter or sort by `last_updated` are ignored. When refreshing V2 cultivar data, do not design around endpoint-side "updated since" queries; take a fresh snapshot and diff it against the local prod copy instead.
- [2026-04-08] Backtick cultivar names need apostrophe folding: Some legacy `AhsListing.name` values use the grave accent/backtick character `` ` `` instead of a real apostrophe, while V2 cultivar names use `'`. In this repo, `src/lib/search-normalization.ts` must fold `` ` `` to `'` or legacy-to-V2 linking misses names like `All Saints\` Episcopal Church` and `It's Just a Memory`.
- [2026-04-10] ChatGPT needs agent-browser attached to a real live Chrome session: On this Mac, headed isolated `agent-browser` sessions and `agent-browser --profile ai` both triggered repeated human-verification prompts on chatgpt.com. The working path is `scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs` attached to a live, already-authenticated Chrome session instead of a spawned automation browser.
- [2026-04-10] Agent-browser ChatGPT worker should reuse an attached session before reconnecting: In `scripts/image-processing/v2-ahs-image-review/chatgpt-worker-agent-browser.mjs`, check `agent-browser get cdp-url` against the current `DevToolsActivePort` first. Only run `connect <port>` when the session is missing or attached to a different Chrome instance; this avoids unnecessary extra Chrome "Allow debugging" prompts.
- [2026-04-10] ChatGPT worker should stop on Chrome approval prompts: If the local ChatGPT worker hits the Chrome `Allow debugging` approval requirement while connecting through the live browser session, it should not keep failing queue items. In this repo it now notifies, puts the current item back to `pending`, and exits so the operator can approve and restart cleanly.
- [2026-04-10] Chrome `ai` profile mapping: On this Mac, the visible Google Chrome profile named `ai` maps to on-disk profile directory `Profile 1` in `~/Library/Application Support/Google/Chrome`. When a tool needs `--profile-directory` or `CDP_CHROME_PROFILE_DIR`, use `Profile 1` for that Chrome `ai` profile.
- [2026-04-10] Chrome CDP port is per browser instance, not per profile: `~/Library/Application Support/Google/Chrome/DevToolsActivePort` belongs to the whole Chrome user-data dir/browser instance, so `--cdp <port>` can see tabs from multiple Chrome profiles if they share that instance. When future agents need hard profile isolation on this Mac, do not rely on a shared Chrome profile plus CDP alone; use a separate `--user-data-dir` browser instance instead.
- [2026-04-10] ChatGPT still trips captchas under `agent-browser --profile ai`: A headed `agent-browser --profile ai` run looked promising briefly on this Mac, but the user later confirmed it still falls into repeated human-verification prompts on chatgpt.com. When automating ChatGPT here, do not rely on profile-launched agent-browser sessions; if using agent-browser at all, attach to the live Chrome instance instead.
- [2026-04-10] agent-browser CDP should connect once, not pass `--cdp` every command: For the live Chrome attach path on this Mac, repeatedly running `agent-browser --cdp "$PORT" ...` can trigger the Chrome Allow debugging prompt over and over. The stable pattern is `agent-browser --session <name> connect "$PORT"` once, then run later commands with just `agent-browser --session <name> ...`.
- [2026-04-10] agent-browser eval on ChatGPT can double-encode JSON: In the ChatGPT image worker here, `agent-browser eval 'JSON.stringify(...)'` can come back as a JSON string inside another JSON string. When extracting structured page state, parse once and, if the result is still a string, parse it again before reading fields.
- [2026-04-10] ChatGPT generated image fetch must happen inside the browser session: For generated image URLs on chatgpt.com, copying cookies into a Node-side fetch still produced `403` on this Mac. To save generated images reliably here, fetch the image from `agent-browser eval` in the live session with `credentials: "include"` and return a data URL or blob payload to Node for writing.
- [2026-04-10] ChatGPT worker failure artifacts live under downloads debug: The `agent-browser` ChatGPT worker writes a text snapshot plus full-page screenshot for real item failures under `downloads/v2-ahs-image-review/debug/`. When debugging a timeout or selector miss here, check the `debugText=` and `debugShot=` paths in `chatgpt-worker.log` first.
