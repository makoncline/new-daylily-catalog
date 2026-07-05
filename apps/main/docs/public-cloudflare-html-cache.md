# Public Cloudflare HTML Cache

Date: 2026-07-05

This is the current cache-owner plan for public Daylily Catalog HTML after the
July 2026 memory/OOM investigation. It intentionally replaces the earlier
route-ISR recommendation in `public-rendering-cache-strategy.md` for the routes
listed here.

## Decision

Use Cloudflare as the single whole-document cache owner for high-cardinality
public HTML routes. The app should render anonymous, deterministic HTML from
the public read models on an origin miss, and Cloudflare should serve the cached
document on normal traffic and crawler traffic.

In the app:

- Public document routes in this rollout use `dynamic = "force-dynamic"`.
- They must not export `revalidate` or `dynamic = "force-static"`.
- They must not depend on Clerk, tRPC React context, request cookies, or
  per-user providers in their public render tree.
- App Router RSC and prefetch variants must stay out of long-lived public HTML
  caches.
- Public search remains dynamic and is not part of this HTML cache rule.

The public read path still uses `replicaDb` where the read model supports it, so
origin misses stay cheap and do not hit live Turso for normal public reads.

## Routes In Scope

Cache these public document routes:

- `/catalogs`
- `/cultivar/*`
- `/:seller`
- `/:seller/page/:page`
- `/:seller/:listing`

Leave these out of this rollout:

- `/`
- `/start-membership`
- `/:seller/search`
- `/dashboard/*`
- `/api/*` and `/api/trpc/*`
- auth, onboarding, subscription, webhook, MCP, well-known, and static asset
  routes
- App Router RSC requests: `_rsc` query, `RSC: 1`, or `Accept:
  text/x-component`
- browser prefetch requests
- requests with authenticated Clerk/session cookies or an `Authorization`
  header

The static home and membership pages are intentionally excluded for now. They
are low-cardinality and not the source of the memory pressure we are trying to
shield.

## Cloudflare Rules

Use positive inclusion, not "cache everything that is not excluded", while the
public and dashboard apps share one hostname. This keeps future dashboard or
auth routes from becoming cacheable by accident.

Create the same shape in dev first on `dev.daylilycatalog.com`, then copy it to
`daylilycatalog.com` after proof.

1. Cache Rule: public HTML eligibility

   - Hostname: the target hostname only.
   - Methods: `GET` and `HEAD`.
   - Route shape: only the in-scope public document routes above.
   - Exclude RSC/prefetch variants.
   - Exclude authenticated/session requests.
   - Cache eligibility: eligible / cache everything.
   - Cache key: host + path, ignore query string after excluding `_rsc`.
   - Cache TTL by status code:
     - `200-299`: `43200` seconds.
     - `300-399`: `43200` seconds for stable redirects.
     - `400-499`: `0` seconds or a short explicit TTL only after testing.
     - `500-599`: no-store.

2. Cache Response Rule: public HTML SWR directives

   Scope this to the same hostname and route shape, and include
   `http.response.code in {200 301 302 307 308}` so missing sellers/listings are
   not stored for the long document TTL.

   Use Cloudflare-only Cache-Control directive edits:

   - remove `private`
   - remove `no-store`
   - remove `no-cache`
   - remove `must-revalidate`
   - remove `proxy-revalidate`
   - remove `s-maxage`
   - set `max-age=43200`
   - set `stale-while-revalidate=604800`
   - optional: set `stale-if-error=86400`

   We verified the key behavior on production with a route-scoped test rule for
   `/catalogs`: Cloudflare returned `MISS`, then `HIT`, then `UPDATING`, then a
   refreshed `HIT` once `s-maxage` was removed and `max-age` plus
   `stale-while-revalidate` were set for Cloudflare only.

Do not use a Worker or normal response-header transform for these directives.
Cloudflare's own docs say Cache Rules decide cache eligibility, while Cache
Response Rules run before caching and can modify cache behavior from origin
response headers.

## Dev Rollout

Use the prod-like local Docker smoke workflow:

1. Prepare a local production-shaped app backed by the local production DB copy:
   `apps/main/docs/prod-like-local-docker-smoke.md`.
2. Expose that app through the existing Cloudflare tunnel as
   `dev.daylilycatalog.com`.
3. In Cloudflare, create or update rules scoped only to
   `dev.daylilycatalog.com`.
4. Verify anonymous document requests for each in-scope route:
   - first request: `cf-cache-status: MISS`
   - second request: `cf-cache-status: HIT`
   - after a short test TTL expires: `cf-cache-status: UPDATING` or a refreshed
     `HIT`
5. Verify exclusions:
   - `/:seller/search` is not cached.
   - `_rsc` requests are not cached.
   - signed-in requests are not cached.
   - dashboard/API/auth routes are not cached.
6. Click through the site in Chrome as a user would, then use anonymous document
   requests for the clean cache proof. App Router clicks often fetch RSC, so
   click testing and document cache testing answer different questions.

## Production Rollout

After the app change is deployed:

1. Confirm origin public HTML no longer reports Next ISR headers for the
   converted routes.
2. Copy the proven dev rules to `daylilycatalog.com`.
3. Test one route first, then expand the same rule to the remaining route
   shapes.
4. Use targeted URL purges when needed. Purge both canonical and common variant
   URLs if the cache key still includes query strings; if the rule ignores query
   strings, purge the canonical path.
5. Monitor memory telemetry for 48-72 hours:
   - `arrayBuffers` and `external` should stop climbing all day.
   - RSS should stabilize instead of walking toward the container limit.
   - no OOM/137 restarts.
   - public origin request volume should drop for cached document routes.

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
