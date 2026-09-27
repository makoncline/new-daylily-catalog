# Public Cloudflare Cache

The app sets `Cloudflare-CDN-Cache-Control` for cacheable public responses.
Keep the Cloudflare Cache Rule aligned with that header.

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
   - successful cultivar search/facet API and cultivar share image responses
     include the public CDN directive, while their errors do not
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
