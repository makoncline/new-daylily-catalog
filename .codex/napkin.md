# Napkin

## Log

- 2026-02-19 - test fixture typing - `RouterOutputs["public"]["getProfile"]` in unit tests rejects partial literal + direct cast; provide the full object shape (or intentionally cast via `unknown`) to keep `tsc --noEmit` green.
- 2026-02-19 - route path shell globbing - Unquoted paths containing `[...]` failed in zsh (`no matches found`). Quote route paths when reading/editing files under App Router dynamic segments.
- 2026-02-19 - header/mobile UX correction - User wants `/{slug}/search` header simplified (garden name + search/filter subheading + contact CTA) and wants mobile image panel restored on `/{slug}`.
- 2026-02-19 - static user pages redo - Re-implement PR #67 behavior from scratch on a fresh branch; use PR diff only as reference, keep component composition explicit, and avoid effect-driven derived state (follow React "You Might Not Need an Effect").
- 2026-02-19 - static SEO route pitfall - Reading `searchParams` in server `/{slug}` and `/{slug}/page/[page]` page/metadata made responses `private, no-store` at runtime even with `force-static`. For crawl-first static behavior, keep those server files query-agnostic and handle `?page` through middleware rewrite + `/page/[page]` params only.
- 2026-02-19 - suspense shell pitfall - Wrapping SEO profile/listings sections in `Suspense` without fallback produced shell-only initial body (`template B:*` + hidden stream payload) until JS applied it. Remove those wrappers on SEO pages when you want full content directly visible in first HTML response.
- 2026-02-19 - static first-response test pattern - Add a small `@local` E2E test that seeds a public profile, fetches raw HTML via Playwright `request`, and asserts first-document content includes profile/listings while excluding streamed-shell markers (`template id=\"B:*\"`, hidden `S:*` chunks). Keep cache-header assertions out of local dev mode.
- 2026-02-19 - e2e URL expectations - Dashboard listings filters now write plain query-string values (not JSON-quoted), so e2e `expectUrlParam` assertions should compare against raw tokens. Also with `force-static` profile page canonical redirects from `/{userId}` to `/{slug}` can drop non-page query params; tests should not assume `viewing`/`utm_*` survive that redirect.
- 2026-02-19 - e2e timeout flake - `manage-list-page-features` can timeout on first `page.goto('/dashboard/lists/:id')` during full-suite dev-server compile churn (passes in isolation). Mark the test `test.slow()` to align timeout budget with heavier route compile cost.
- 2026-02-19 - infinite query page params - `useInfiniteQuery` initial data in this repo expects `pageParams` with `undefined`, while `utils.public.getListings.setInfiniteData` expects `string | null`; avoid forcing one shape globally and let snapshot creation accept both (`string | null | undefined`), normalizing persisted values.
- 2026-02-19 - requestIdleCallback narrowing - In TS with DOM libs, checking `"requestIdleCallback" in window` can narrow the fallback branch to `never`; use global `setTimeout`/`clearTimeout` in fallback instead of `window.setTimeout`.
- 2026-02-19 - lint gotcha - `@typescript-eslint/no-empty-function` flags no-op cleanup lambdas; return `() => undefined` for intentional no-op cleanup in client helpers.
- 2026-02-19 - idb error handling - `void`-ing async IndexedDB writes/reads can still produce unhandled promise rejections; add explicit `.catch(() => undefined)` or `try/catch` in async effects.
- 2026-02-19 - lint regex style - ESLint prefers `RegExp#exec()` over `String#match()` in this repo (`@typescript-eslint/prefer-regexp-exec`).
- 2026-02-19 - test mocking gotcha - `CatalogSeoListings` pulls in `CatalogSeoPagination`, which uses `useRouter`; tests still need a minimal `next/navigation` mock even when assertions only check link hrefs.
- 2026-02-19 - route-type cache - Removing app routes can leave stale `.next/types/validator.ts` references; run `pnpm exec next typegen` before `tsc --noEmit`.
- 2026-02-19 - command sequencing mistake - Parallelized dependent `mkdir` + file-write commands and hit intermittent `no such file or directory`; run dependent path creation and writes sequentially.
- 2026-02-19 - command policy note - Direct `rm` commands can be blocked by policy in this environment; prefer `apply_patch` delete hunks for file removals.
- 2026-02-14 - dashboardDb cultivar refs - For main dashboard TanStack DB cutover, prefer cultivar-reference cache option (1): cache only refs referenced by the user's listings; keep listing payloads small (only `cultivarReferenceId`) and join locally for AHS display. Do not expose `ahsId` as a standalone field (nested `ahsListing` is OK for now).
- 2026-02-14 - dashboardDb persisted SWR - For faster reloads, hydrate dashboardDb collections from a per-user IndexedDB snapshot (toggle via a single const) then revalidate in background. Because sync endpoints are upserts-only (no deletions), schedule snapshot persistence after key mutations (especially deletes) to prevent resurrecting deleted rows on reload.
- 2026-02-14 - dashboardDb hardening - Provider should gate rendering on collection readiness (prevents "write before sync context" crashes) and purge `["dashboard-db"]` query cache + collection cleanup on logout/auth change to avoid cross-user flashes during debugging.
- 2026-02-14 - dashboardDb bootstrap - Factor the repeated init sequence (set current user, seed query cache, set cursor, clear tombstones, preload) into `bootstrapDashboardDbCollection` so it stays consistent across collections and is harder to regress.
- 2026-02-14 - dashboardDb cursors - For incremental sync, advance cursors to the max `updatedAt` observed in returned rows (and keep previous cursor on empty results). Setting cursor to "now" can permanently skip writes that occur during the sync window. Also: `collection.utils.refetch()` won't run if the underlying TanStack Query is disabled; keep query-collections `enabled: true`.
- 2026-02-14 - legacy listing status - Treat any legacy `status` values other than `STATUS.HIDDEN` as published/null so forms don't crash on `"published"` or `""`.
- 2026-02-13 - vercel build snapshot - Avoid downloading sqlite tools by scraping sqlite.org; use OS package install (Vercel/Amazon Linux via `dnf install sqlite`) or fail clearly. Build snapshot uses `USE_TURSO_DB_FOR_BUILD` and must not change runtime `USE_TURSO_DB`.
- 2026-02-12 - prisma artifacts - Do not commit generated Prisma client output (`prisma/generated/sqlite-client`) or SQLite DB files; commit schema + migration/source changes only.
- 2026-02-12 - next route config - Route-segment exports like `export const revalidate` and `export const dynamicParams` must stay literal in the page file; imported config/object property values can fail static parsing.
- 2026-02-12 - profile deep-link UX - For `?viewing=` on public profile, avoid transient “Listing not found”; fetch `public.getListing` when the ID is not in loaded pages and show a loading state until query resolves.
- 2026-02-12 - cleanup preference - For agent cleanup passes, user prefers concise readable code with minimal defensive noise; keep composition explicit and align tests to current data contracts (e.g. AHS-only hero images).
- 2026-02-11 - cultivar page revamp - User wants cultivar pages grouped by pro catalogs (not flat listings), with AHS hero image, no add-to-cart, and listing deep links via `/:slug?viewing=:listingId`.
- 2026-02-11 - routing migration - User chose global cultivar canonicals (`/cultivar/:normalizedName`) with cultivar pages showing all sellers, while legacy listing route should only redirect canonical `/:userId/:listingId` to `/:userSlug?viewing=:listingId`.
- 2026-02-12 - seo/crawling - For cultivar sitemap entries, avoid `lastModified: new Date()` noise; use real entity timestamps (cultivar/listing `updatedAt`) and include AHS image in cultivar OG/Twitter metadata when present.
- 2026-02-12 - cultivar slug canonical - User wants clean cultivar URL slugs (slugified, not URI-encoded punctuation) and sitemap/static generation aligned to listing-backed cultivars by config.
- 2026-02-12 - cultivar redesign - User wants conversion-first cultivar page with offers toolbar query params (`offerSort`, `offerForSale`, `offerHasPhoto`), no public add-photo CTA, and related cultivars limited to image-backed public pages.
- 2026-02-09 - ahs migration - User wants data migration SQL to be generated by script, not hand-authored, so reruns are deterministic and auditable.
- 2026-02-09 - conversion UX - Reused `FloatingCartButton` dialog state for a new top-of-profile `Contact Seller` CTA while keeping the bottom-right floating button.
- 2026-02-09 - product review correction - Public listing has a bottom-right floating contact/cart action; it was easy to miss in snapshots because icon-only controls lacked clear labels in the accessibility tree.
- 2026-02-09 - product review - When asked for customer-value feedback, run Playwright on public flows (home -> catalogs -> catalog -> listing -> auth modal) and prioritize activation, conversion, and retention gaps with concrete examples.
- 2026-02-09 - e2e observability - Force `NEXT_PUBLIC_SENTRY_ENABLED=false` in Playwright local config and `webServer.env` so local E2E never initializes Sentry.
- 2026-02-07 - e2e cleanup - Full suite stabilized after removing most custom timeout/retry/poll code and validating with repeats.
- 2026-02-07 - e2e issue - Profile content sometimes disappeared after reload due autosave race; fixed by waiting for `userProfile.updateContent` response after blur.
- 2026-02-07 - e2e issue - Clerk modal has variant state: after email click `Continue`; after code entry do not submit again (auto-submit). If warning says code wasn't sent, click `Continue` once.
- 2026-02-07 - e2e issue - Select/popup items can be outside viewport; `scrollIntoViewIfNeeded()` before click fixed intermittent failures.
- 2026-02-07 - e2e issue - Listings row-action dropdown was flaky in CI/local when relying on generic role selectors or `force: true`; stable approach is explicit row-action test IDs + menu-open assertions (trigger `aria-expanded`) before clicking action items.
- 2026-02-08 - e2e issue - Listings row-action still flaked when search query updates were still propagating; fix was to wait for URL query state (`expectUrlParam("query", value)`) before opening row actions.
- 2026-02-08 - e2e issue - `scrollIntoViewIfNeeded()` on row-action trigger can throw `Element is not attached to the DOM` during table re-render; direct locator `.click()` was more stable for this trigger.
- 2026-02-08 - e2e issue - URL-param assertions (`expect.poll` on `page.url()`) were flaky in CI/act despite correct UI behavior; replacing with table/page-indicator assertions removed false negatives.
- 2026-02-08 - e2e issue - `page.locator("table").first()` is brittle when pages render multiple tables; scope all row locators to container test ids (`list-table`, `manage-list-table`) to avoid wrong-table clicks and detach.
- 2026-02-09 - seo/public routes - Avoid `as const` on Prisma `where` filter objects (`OR` arrays become readonly and break Prisma + no-unsafe typing across route outputs).
- 2026-02-09 - tooling - `pnpm install` runs `prisma generate` and may rewrite generated client paths/binary targets to local machine values; revert generated noise before finalizing changes.
- 2026-02-10 - dual-write - User prefers Prisma ORM writes over raw SQL for dual-write paths; if cultivar reference rows are missing, throw explicit runtime error instead of auto-creating with raw SQL.
- 2026-02-10 - migration docs - For migration follow-ups, provide task breakdown as JSON with explicit `completed` boolean fields so lower-context agents can execute safely.
- 2026-02-10 - edit dialog bug - Unlinking AHS in `AhsListingLink` can be reverted on dialog close if `ListingForm` still holds stale `ahsId`; sync `ahsId` into form state on link/unlink success to prevent close-save from re-linking.
- 2026-02-10 - unlink/save regression - Better fix was decoupling: keep `ahsId` out of form schema/state and allow router `update` input to accept optional `ahsId` for link/unlink component calls only; this prevents Save from re-linking stale AHS data.
- 2026-02-10 - api boundary cleanup - Final simplification: `AhsListingLink` should call `listing.linkAhs`/`listing.unlinkAhs` directly; then `listing.update` can stay form-only (`listingFormSchema`) with no `ahsId` handling.
- 2026-02-11 - pre-merge stabilization - For AHS V2 flagged rollout, keep `syncAhsName` strict canonical (`cultivarReference.ahsListing` only), keep secret menu override client-only, and enforce data invariants with SQL checks in migration docs.
- 2026-02-11 - create dialog regression - Empty/whitespace title must fall back to selected AHS name (then default listing name) so create payload never sends blank titles.
- 2026-02-11 - type alignment - When router responses add derived `ahsListing` via `withDisplayAhsListing(s)`, hook return types must use `WithDisplayAhsListing<T>` and sibling routers (e.g. `list.getListings`) should return the same derived shape to avoid table generic mismatches.
- 2026-02-11 - e2e temp-db reset - `withTempE2EDb` must clear `CultivarReference` before `AhsListing`; otherwise retries leave orphaned refs (`ahsId` null) and deterministic seed upserts can fail unique on `CultivarReference.id`.
- 2026-02-13 - prisma db push - Prisma schema engine can fail to start when `RUST_LOG=warn`; set `RUST_LOG=info` (and clear `NODE_OPTIONS`) for `prisma db push` in scripts/tests.
- 2026-02-13 - tanstack db collections - `@tanstack/query-db-collection` write utils require sync context; start collection sync via `useLiveQuery` subscription or `await collection.preload()` (after seeding query cache) before calling `utils.writeInsert`/`writeUpdate`/`writeDelete`.
- 2026-02-13 - tanstack db SSR - Next can server-render client components; `useLiveQuery` can warn (`Missing getServerSnapshot`) if it hits SSR. Fix by rendering live-query components client-only (dynamic import `ssr:false` or mount-gate and put `useLiveQuery` in a child rendered only after `useEffect`).
- 2026-02-13 - data-table column filters - `useDataTable` URL-sync only tracks columns with `filterFn`; if a column shows a filter UI, ensure it sets `filterFn` (e.g. `fuzzyFilter`) or the filter can be dropped on search-param navigation.
- 2026-02-13 - e2e popover filters - Radix popover filter inputs can detach during URL-sync/table rerenders; in Playwright, target by exact placeholder and retry after `Escape` + reopen.
- 2026-02-13 - unit test env - Importing the full `appRouter` can eagerly construct clients (e.g. Stripe) and crash if env vars are missing even with `SKIP_ENV_VALIDATION=1`; set minimal placeholder env vars or import routers directly.

## Preferences

- Write tests, not too many, mostly integration, hapy path e2e.
- TanStack DB dashboard migration: keep procedures under new `dashboardDb` router, migrate main `/dashboard` page-by-page, and run `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm test:e2e` before each incremental commit.
- Cultivar pages should be catalog-centric (catalog cards with nested cultivar listing rows), not listing-card grids.
- Use composition patterns for new UI components (prefer explicit composed sections over boolean-mode props).
- Use the term `napkin` (not `codex napkin`).
- Keep E2E tests UI-only; if UI behavior fails, test should fail (don't hide with non-UI shortcuts).
- For Vercel production builds, prefer building against a local snapshot of the prod DB (to avoid slow remote Turso queries); preview builds can keep using Turso.
- Use a 3-step DB rollout for this repo's AHS migration work: Prisma structural migration, then generated SQL file for reference-table data load, then generated SQL file for listing backfill.
- Avoid `executeRawUnsafe` in application and migration-adjacent app code when Prisma ORM operations can do the job.
- For product-feedback asks, return prioritized recommendations tied to activation, conversion, and retention.
- During AHS V2 rollout, keep API inputs backward-compatible (`ahsId` + `cultivarReferenceId`) until post-cutover cleanup.
- For base profile -> catalog search CTA, carry only the `page` param (when present) and do not forward other search/filter params.
- For table URL sync, never JSON-quote plain string filter values; `lists` must parse as string-array even when a single ID is provided, otherwise faceted filter UI can show character-count selections.
- On public `/user` SEO listings UX, user wants a dedicated "Search and filter listings" CTA below the Listings heading, pagination controls at both top and bottom, and pagination navigation anchored back to `#listings`.
- SEO pagination on public `/user` should visually mirror the existing table pagination controls, but replace "Rows per page" with a "Go to page" selector.
- Updated preference: simplify public `/user` SEO pagination to sketch style `Page [select] of N` with only previous/next arrows, and align search CTA on the same row when space allows.
- Keep the top listings control row with search CTA left and pagination right; page-number select should auto-fit content instead of a fixed width.
- On public `/{slug}/search`, reuse the same profile header section as `/{slug}` (including contact/cart controls) and show `N total` beside the Listings heading.
- Follow-up UX correction: `/{slug}/search` header also needs the profile image panel (not just text/stats/buttons), matching the `/user` header layout.
- On public `/{slug}` section nav, include a `Search/filter` link to `/{slug}/search`, carrying only the `page` param when present.
- Hide profile image panel on mobile for public profile header layouts (`/{slug}` and `/{slug}/search`) to prioritize text/actions and reduce above-the-fold height.
- Updated UX preference: `/{slug}/search` should use a lean search-focused header (garden name + search/filter subheading + Contact Seller button), and `/{slug}` should show the profile image panel on mobile again.
- Updated pagination preference: use a dedicated `/{slug}` listings page-size constant (set to 100) instead of shared table defaults, and show pagination both above and below listings (top control to the right of search CTA on larger screens, below it on small screens).
- Route naming update: public interactive search page uses `/{slug}/search`; keep `/{slug}/catalog` as a compatibility redirect.
- Updated preference: do not keep `/{slug}/catalog` compatibility redirect since it was introduced and removed within this PR; keep only `/{slug}/search`.

## Patterns That Work

- Simplify first: remove stability scaffolding, then re-add only minimal waits tied to real UI/events when failures prove necessary.
- Use `--repeat-each` to prove changes: spec-level `--repeat-each 3` while iterating, then suite-level `tests/e2e/*.e2e.ts --repeat-each 2`.
- Prefer UI signals (visible/enabled/url/assertions) over polling and explicit timeouts.
- For Radix dropdown interactions in table rows, use open-menu assertions (`data-state=\"open\"`) and action-specific selectors instead of structural table locators (`table.last()`, `aria-controls`).
- Scope table interactions to test-id containers first, then table internals (avoid global `table.first()` selectors).

## Patterns That Fail

- Preemptive "stability" code (long custom timeouts, retry loops, blanket force-clicks) made tests harder to reason about.
- Reloading immediately after EditorJS typing without waiting for save completion caused flaky assertions.
- Pressing submit after entering Clerk verification code added instability; code field completion should auto-submit.
- Row-action flows tied to table re-renders can detach menu items mid-click; generic `getByRole(\"menuitem\")` across the page is brittle.
- `scrollIntoViewIfNeeded()` is not universally safer; on rapidly rerendering table rows it can increase detach failures.
- URL-state polling as a primary assertion layer can fail even when the visible table state is correct.

## Domain Notes

- Occasional server-side `ECONNRESET` or transient tRPC errors may appear during runs; prioritize actual test assertion failures over noisy logs.
