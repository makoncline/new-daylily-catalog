# Public HTML Cloudflare Cache

Public SEO HTML pages are rendered dynamically by Next.js and declare shared-cache
intent with `Cache-Control`, `CDN-Cache-Control`, and
`Cloudflare-CDN-Cache-Control` headers from `src/proxy.ts`.

Cloudflare still needs a Cache Rule to make these HTML responses cache-eligible.
Without that rule, the origin headers are only intent; Cloudflare does not cache
HTML by default.

## Cache Rule

Create a Cloudflare Cache Rule for public HTML routes:

- `/`
- `/catalogs`
- `/:userSlugOrId`
- `/:userSlugOrId/page/:page`
- `/cultivar/:cultivarNormalizedName`
- `/:userSlugOrId/:listingSlugOrId`

Rule behavior:

- Eligible for cache.
- Match only `GET` requests.
- Match only `text/html` responses.
- Respect origin cache headers.
- Cache only successful `200` responses if the available Cloudflare rule
  conditions support response-status matching.
- Do not set an Edge Cache TTL override unless intentionally replacing
  origin `s-maxage` and `stale-while-revalidate`.
- Bypass cache when `Cookie` or `Authorization` is present.
- Bypass cache for query-string requests, including `_rsc`.
- Bypass cache for App Router variant headers:
  - `RSC`
  - `Next-Router-State-Tree`
  - `Next-Router-Prefetch`
  - `Next-Router-Segment-Prefetch`
  - `Next-Url`

If response-status matching is not available, do not set a long Edge Cache TTL
override, and verify valid-shaped `404` or `500` responses do not become
persistent Cloudflare HITs.

Recommended: enable Cloudflare Tiered Cache or Smart Tiered Cache for
`daylilycatalog.com`. This reduces duplicate origin MISSes across Cloudflare
data centers for the same public HTML URL.

## Cold Crawl Caveat

Cloudflare HTML caching protects repeat hits. It does not fully protect the
origin from first-hit crawls across many unique URLs, such as a bot walking
thousands of listing pages immediately after deployment, purge, or cold edge
state.

For this app, the production strategy is:

- Cloudflare cache for repeat public HTML hits.
- Cloudflare or Caddy rate limits for cold unique crawl pressure.
- Local replica DB reads for cheap origin misses.
- No Next per-path ISR cache for high-cardinality public pages.
- Process memory caps and restart policy on the VPS.

## Production Smoke

Plain public HTML should MISS, then HIT. Use `GET` while discarding the body;
`HEAD` is useful for header inspection but should not be used to prove
Cloudflare cache population.

```bash
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/timber-man
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/timber-man
```

Expected:

```text
CF-Cache-Status: MISS
CF-Cache-Status: HIT
X-Daylily-Cache-Policy: public-seo-html; route=listing_page
```

Cookie-bearing requests must bypass cache:

```bash
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/timber-man \
  -H 'Cookie: __session=fake'
```

Expected:

```text
CF-Cache-Status: BYPASS
```

Query and RSC variants must also bypass:

```bash
curl -sS -D - -o /dev/null 'https://daylilycatalog.com/rollingoaksdaylilies/timber-man?_rsc=abc'
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/timber-man \
  -H 'RSC: 1'
```

Valid-shaped missing pages should not become persistent cache HITs:

```bash
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/not-a-real-listing
curl -sS -D - -o /dev/null https://daylilycatalog.com/rollingoaksdaylilies/not-a-real-listing
```

Expected: non-HIT behavior, or only a short Cloudflare TTL if status-aware rules
are not available.

## Origin Render Analytics

The `public_html_origin_rendered` PostHog event measures Node origin renders,
not pageviews. When Cloudflare caching is working, bot/user pageview volume can
stay high while this event drops because CDN HITs never reach the Next process.
