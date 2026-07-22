# Public Cloudflare Cache

Date: 2026-07-22

This is the current cache-owner plan for public Daylily Catalog HTML after the
July 2026 memory/OOM investigation. It intentionally replaces the earlier
route-ISR recommendation in `public-rendering-cache-strategy.md` for the routes
listed here.

## Decision

Use Cloudflare as the cache owner for anonymous public documents and cultivar
search responses. The app renders deterministic responses on an origin miss,
and Cloudflare serves the cached response for normal traffic and crawler
traffic.

The successful-response TTL lives in one app constant and is sent as a
Cloudflare-only response header:

```http
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
```

That means:

- Cloudflare may store a successful public HTML document for 12 hours.
- After the 12-hour fresh window, Cloudflare may serve stale HTML for 7 days
  while it revalidates in the background.
- During origin errors, Cloudflare may serve stale HTML for 1 day.
- The normal `Cache-Control` header can stay controlled by Next. For these
  dynamic App Router routes, Next still emits browser/origin-safe no-store
  directives.

Cloudflare still owns request eligibility. It decides which requests may use the
app's CDN cache directive: anonymous public document requests only. This keeps
the successful-page cache duration in app code while keeping auth, RSC,
prefetch, API, and error-response safety at the edge where that information is
available.

## Online Guidance

The current official guidance points to this shape:

- Next self-hosting docs recommend a reverse proxy in front of `next start`, and
  say that when a CDN/reverse proxy is in front of Next, it must respect
  route-specific cache headers and cache-key variability.
  <https://nextjs.org/docs/app/guides/self-hosting>
- Next CDN docs say static and ISR pages are cacheable from standard
  `Cache-Control`, while dynamic pages intentionally emit `private, no-cache,
  no-store, max-age=0, must-revalidate`. The docs also warn that CDN cache and
  Next's internal revalidation are separate systems, so CDN purges are required
  when on-demand revalidation must be instant.
  <https://nextjs.org/docs/app/guides/cdn-caching>
- The same Next CDN docs call out App Router RSC/prefetch variability. Today,
  `_rsc`, RSC headers, and related request headers are cache-affecting variants,
  so a generic "ignore all query strings" or "cache every URL" rule is not safe.
  <https://nextjs.org/docs/app/guides/cdn-caching>
- Cloudflare docs recommend `Cloudflare-CDN-Cache-Control` when Cloudflare needs
  different cache behavior from browsers or other downstream caches. With no
  matching Cache Response Rule, Cloudflare evaluates that header for its own
  caching decisions and does not proxy it downstream.
  <https://developers.cloudflare.com/cache/concepts/cdn-cache-control/>
- Cloudflare docs say Cache Response Rules take precedence over origin-set
  `Cloudflare-CDN-Cache-Control` and that Edge TTL overrides can override origin
  cache directives. Do not use those for successful public HTML unless we are
  deliberately moving TTL ownership back into Cloudflare.
  <https://developers.cloudflare.com/cache/concepts/cdn-cache-control/>
- Cloudflare docs say stale-while-revalidate only works when the effective
  origin cache directives allow stale serving; directives such as `no-cache`,
  `must-revalidate`, `proxy-revalidate`, or `s-maxage` prevent stale serving.
  The CDN-specific header is how we keep Cloudflare's effective directives
  separate from Next's browser-facing no-store header.
  <https://developers.cloudflare.com/cache/concepts/revalidation/>
- OpenNext for Cloudflare has its own incremental cache, queue, and tag-cache
  architecture when the Next runtime itself runs on Cloudflare Workers. That is
  relevant for a future platform move, but it is not the simplest current answer
  while this app runs on the VPS behind Cloudflare.
  <https://opennext.js.org/cloudflare/caching>

## App Contract

In the app:

- Data-backed public document routes use `dynamic = "force-dynamic"` and must
  not export `revalidate` or `dynamic = "force-static"`.
- Fixed-content public pages can remain statically prerendered. In-scope static
  pages receive the same Cloudflare-specific TTL as dynamic public documents.
- In-scope routes must not depend on Clerk, tRPC React context, request
  cookies, or per-user providers in their public render tree.
- Public HTML document responses for the in-scope routes get a cacheable
  `Cloudflare-CDN-Cache-Control`.
- Public document requests with an `Authorization` header or Clerk `__session`
  or `__session_<suffix>` cookie do not get the public CDN cache header. The
  edge rule applies the same credential exclusion to public API responses.
- App Router RSC and prefetch variants get no long-lived CDN cache directive.
  Public RSC requests keep `Cache-Control: no-store`.
- Cloudflare must still exclude `_rsc` query variants at the edge. In
  standalone `next start`, a bare `_rsc` query without component request
  headers can be normalized before proxy code can inspect it; the app reliably
  no-stores real component requests via `Accept: text/x-component`/RSC headers.
- `/cultivars` document variants and the public cultivar search/facet JSON
  responses use the same app-owned CDN policy. Cloudflare's default full-URL
  key keeps each query-string combination separate.

The public read path still uses `replicaDb` where the read model supports it, so
origin misses stay cheap and do not hit live Turso for normal public reads.

## Routes In Scope

Cache these dynamic public document routes:

- `/`
- `/catalogs`
- `/cultivar/*`
- `/cultivars` and each full query-string variant
- `/start-membership`
- `/:seller`
- `/:seller/page/:page`
- `/:seller/:listing`

Cache these static public document routes:

- `/privacy`
- `/support`
- `/terms`

Cache successful responses from these public read APIs, keyed by the full URL:

- `/api/v1/cultivars/search`
- `/api/v1/cultivars/facets`

Leave these out of this rollout:

- `/:seller/search`
- `/dashboard/*`
- other `/api/*` and `/api/trpc/*` routes
- auth, onboarding, subscription, webhook, MCP, well-known, and static asset
  routes
- App Router RSC requests: `_rsc` query, `RSC: 1`, or `Accept:
  text/x-component`
- browser prefetch requests
- requests with authenticated Clerk/session cookies or an `Authorization`
  header

## Cloudflare Rule

Use one header-driven Cache Rule. Matching the rule only makes a request
eligible for caching; the response is stored only when the app sends an
explicit cache header. A response without a cache header bypasses Cloudflare.
This lets the app remain the cache-policy owner without requiring a Cloudflare
change for each new public page.

Create the same shape in dev first on `dev.daylilycatalog.com`, then copy it to
`daylilycatalog.com` after proof.

Use one Cache Rule for application response eligibility:

- Hostname: the target hostname only.
- Methods: `GET` and `HEAD`.
- Exclude RSC/prefetch variants.
- Exclude requests with an `Authorization` header or a cookie whose name starts
  with `__session`, covering both Clerk's `__session` and
  `__session_<suffix>` forms. Do not exclude every cookie: anonymous analytics
  and preference cookies do not change the public document and should not
  bypass the app's cache header. The cookie exclusion used in the rule is
  `not (http.cookie wildcard "*__session*=*")`.
- Cache eligibility: eligible for cache.
- Edge TTL: use the origin cache-control header when present and bypass cache
  when absent (`bypass_by_default`). Do not set a successful-response TTL
  override.
- Browser TTL: respect origin.
- Cache key: start with the default full URL key. Only ignore query strings
  later if we have verified that all public query variants are safe and `_rsc`
  remains excluded.
- Status-code guard in the same rule: `400-599` uses no-store.

Do not maintain a second route allowlist or dashboard/API path exclusion list in
this rule. Excluded responses send no cacheable origin directive. The
credential, component-request, and status guards are narrow defense-in-depth
boundaries, not a second cache policy.

The status-code guard is intentionally the one successful-TTL exception. The app
adds the CDN cache header before the page knows whether the route will become a
404, but Cloudflare can see the final response status. Do not cache missing
sellers/listings for the 12-hour success TTL.

Do not use a Cache Response Rule for the normal public HTML TTL. Any existing
test rule such as `Test SWR for /catalogs` should be disabled or deleted before
final validation, because Cache Response Rules take precedence over the app's
`Cloudflare-CDN-Cache-Control` header.

Do not use a Worker or normal response-header transform for these directives.
Workers and response transforms run at the wrong layer for deciding cache
eligibility and would create another cache policy location.

## Adding Routes

For a new public page:

1. Put the page in the `(public)` route group. Public paths outside the private
   and system first-segment exclusions inherit the cache policy by default.
2. Only change the centralized classifier in `src/proxy.ts` when the new route
   has an exceptional URL shape or must remain uncached.
3. Verify the document response has the intended cache header and its RSC or
   prefetch variant remains `no-store`.

No Cloudflare rule change is required for an individual public page. New pages
under `/dashboard` inherit the dynamic, cookie-aware dashboard layout and stay
uncached without page-specific cache configuration.

## Dev Rollout

Use the prod-like local Docker smoke workflow:

1. Prepare a local production-shaped app backed by the local production DB copy:
   `apps/main/docs/prod-like-local-docker-smoke.md`.
2. Expose that app through the existing Cloudflare tunnel as
   `dev.daylilycatalog.com`.
3. In Cloudflare, create or update the header-driven Cache Rule scoped only to
   `dev.daylilycatalog.com`, using the origin-header-or-bypass Edge TTL mode.
4. Disable any overlapping Cache Response Rule for public HTML.
5. Verify the local origin first:
   - in-scope public documents include `Cloudflare-CDN-Cache-Control`
   - credential-bearing public requests, including suffixed Clerk session
     cookies, omit that public CDN cache header
   - RSC requests include `Cache-Control: no-store`
   - seller search, dashboard, other API, and auth routes do not include a
     cacheable CDN directive
   - successful cultivar search/facet API responses include the public CDN
     directive, while their errors do not
6. Verify anonymous Cloudflare document requests for each in-scope route:
   - first request: `cf-cache-status: MISS`
   - second request: `cf-cache-status: HIT`
7. Verify exclusions:
   - `/:seller/search` is not cached.
   - `_rsc` requests are not cached.
   - signed-in requests, including suffixed Clerk session cookies, are not
     cached.
   - dashboard, other API, and auth routes are not cached.
8. Verify common `/cultivars` query variants and their matching public search
   API URLs independently. The document and JSON result are separate cache
   entries.
9. Click through the site in Chrome as a user would, then use anonymous document
   requests for the clean cache proof. App Router clicks often fetch RSC, so
   click testing and document cache testing answer different questions.

## Production Rollout

After the app change is deployed:

1. Confirm origin public HTML and successful cultivar search API responses
   include the CDN cache header on converted routes.
2. Copy the proven dev Cache Rule to `daylilycatalog.com`.
3. Verify representative cached and uncached routes without adding path filters
   to the rule.
4. Use targeted URL purges when needed. Purge canonical URLs first; purge query
   variants only if the rule still keys on full URL and a variant was cached.
5. Monitor memory telemetry for 48-72 hours:
   - `arrayBuffers` and `external` should stop climbing all day.
   - RSS should stabilize instead of walking toward the container limit.
   - no OOM/137 restarts.
   - public origin request volume should drop for cached document routes.

## 2026-07-22 Dev Proof

Test setup:

- Local prod-like Docker app from `prod-like-local-docker-smoke.md`, backed by
  the local production DB copy.
- Existing Cloudflare tunnel serving that app at `dev.daylilycatalog.com`.
- `Honor explicit origin cache headers (dev)` Cache Rule scoped to
  `dev.daylilycatalog.com`, using origin-header-or-bypass Edge TTL, browser TTL
  respecting origin, and `400-599` no-store.
- Zero active Cache Response Rules.

Local origin proof:

- `/`, `/start-membership`, `/cultivars`, filtered `/cultivars?...`, and the
  established public catalog/cultivar/seller routes returned
  `Cloudflare-CDN-Cache-Control: public, max-age=43200,
  stale-while-revalidate=604800, stale-if-error=86400`.
- Authorization and Clerk `__session` and `__session_<suffix>` requests omitted
  that header, while an anonymous analytics cookie retained it.
- Successful cultivar search and facet JSON responses returned the same CDN
  directive. Invalid and unavailable responses did not.
- Seller search, dashboard, auth, onboarding, and other API routes omitted the
  cacheable CDN directive. Real component requests returned
  `Cache-Control: no-store`.

Cloudflare dev proof:

- Fresh variants for home, membership, default cultivar search, and filtered
  cultivar search returned `MISS` then `HIT`.
- Fresh full-URL variants for the cultivar search and facet APIs returned
  `MISS` then `HIT`.
- Authorization, both Clerk session-cookie forms, and RSC requests remained
  `DYNAMIC`.
- Seller search, sign-in, onboarding, other API, `400`, and `404` responses
  remained `BYPASS`; the error results verified the status-code guard.
- Chrome loaded a cached filtered `/cultivars` document, normalized its URL,
  hydrated 24 filtered results, and reported no console warnings or errors.

## Long-Term Split

The cleaner long-term boundary is separate hostnames/apps for public and
dashboard traffic. At that point the public hostname can use a simpler
hostname-level public HTML cache rule, while the dashboard hostname can bypass
HTML caching entirely.

OpenNext for Cloudflare is relevant if we move the Next runtime itself onto
Cloudflare Workers. It provides primitives for Next's incremental cache and
static assets on Cloudflare infrastructure. While this app runs on the VPS
behind Cloudflare, do not adopt a partial OpenNext cache stack; keep the public
document cache owner as Cloudflare CDN and keep origin rendering deterministic.
