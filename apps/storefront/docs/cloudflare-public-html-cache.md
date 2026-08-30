# Cloudflare public storefront cache

The storefront sends different cache policies for public HTML, public read
APIs, machine discovery documents, and the sitemap. The browser cache policy
and the Cloudflare cache policy are separate.

## Origin response policies

### Public HTML

The storefront sends this edge-only response policy for an eligible document:

```text
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-public-html
```

The browser does not use `Cloudflare-CDN-Cache-Control`. Cloudflare keeps the
HTML fresh for 12 hours. It can serve stale HTML for 7 days while it updates the
entry and for 1 day when the origin has a supported server error. A first stale
request can receive `CF-Cache-Status: UPDATING` while Cloudflare refreshes the
entry in the background.

### Public read APIs

Successful public read API responses send this policy:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-public-html
```

This policy applies only to these anonymous `GET` and `HEAD` routes:

- `/api/catalogs`
- `/api/catalog/*`
- `/api/listings/*`

All public read API error responses send `Cache-Control: no-store` and
`Cloudflare-CDN-Cache-Control: no-store`.

### Machine discovery documents

All successful machine discovery documents send this policy:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
Cloudflare-CDN-Cache-Control: public, max-age=3600, stale-while-revalidate=86400
Cache-Tag: daylily-storefront-public-html
```

This policy applies only to these anonymous `GET` and `HEAD` routes:

- `/.well-known/api-catalog`
- `/openapi.json`
- `/llms.txt`
- `/.well-known/agent-skills/index.json`
- `/.well-known/agent-skills/*/SKILL.md`

### Sitemap

The sitemap has a dedicated policy:

```text
Cache-Control: public, max-age=3600
Cloudflare-CDN-Cache-Control: public, max-age=86400
Cache-Tag: daylily-storefront-public-html
```

The policy applies only to anonymous `GET` and `HEAD` requests for
`/sitemap.xml`. A sitemap error sends `no-store` directives.

## Public HTML request policy

`src/proxy.ts` adds the policy only to anonymous `GET` and `HEAD` document
requests. It includes these route classes:

- `/`
- `/catalogs`
- `/catalog/**`, including supported search and filter query variants
- `/{listingSlug}`
- `/blog`
- `/blog/dorothy-and-toto`
- `/contact`

It does not add the public HTML policy to these request classes:

- `/cart` and `/thanks`
- `/api/**`; the public read API routes use their own policy
- static files and Next.js assets
- requests with an `Authorization` header or a Clerk `__session*` cookie
- React Server Component requests with an `_rsc` query, `RSC: 1`, or an
  `Accept` header that contains `text/x-component`
- requests whose `Accept` header includes `text/markdown`
- prefetch requests with `Next-Router-Prefetch: 1`, `Purpose: prefetch`, or a
  `Sec-Purpose` header that contains `prefetch`
- methods other than `GET` and `HEAD`

Analytics cookies do not make public content private. Cart data stays in the
browser. It does not change public HTML.

The inquiry route and the health route send `Cache-Control: no-store`. React
Server Component traffic sends `Cloudflare-CDN-Cache-Control: no-store`. Next.js
can replace its browser cache header after the proxy runs. The Cloudflare bypass
rule must reject RSC traffic before cache lookup.

## Required Cloudflare Cache Rule

Use one hostname-scoped, header-driven rule. Do not maintain a second route
allowlist at the edge. The origin policies above are the opt-in contract for
HTML, dotted listing and list slugs, public read APIs, machine documents, and
the sitemap.

1. Make only `GET` and `HEAD` requests eligible. Before cache lookup, bypass
   requests with an `Authorization` header; an `_rsc` query; `RSC: 1`; an
   `Accept` header that contains `text/x-component`;
   `Next-Router-Prefetch: 1`; `Purpose: prefetch`; or a `Sec-Purpose` header
   that contains `prefetch`. Also bypass cookies whose names start with
   `__session`, which covers `__session` and `__session_<suffix>`. The cookie
   exclusion used in the rule is
   `not (http.cookie wildcard "*__session*=*")`. Do not exclude every cookie.
   Bypass negotiated page requests whose `Accept` header includes
   `text/markdown`. The dedicated agent skill documents are canonical Markdown
   resources, so this last bypass does not apply to exact
   `/.well-known/agent-skills/*/SKILL.md` routes.
2. Set Edge TTL to **Use cache-control header if present, bypass cache if not**.
   Enable `bypass_by_default` so a response without an opt-in cache directive
   does not enter the cache. This keeps cart and other non-public responses out;
   inquiry and health responses also send `no-store` explicitly.
3. Set the status-code TTL for the complete `400` through `599` range to
   **no-store**. The Rulesets API value is `-1`. Do not use `0`; Cloudflare
   defines `0` as no-cache, which can still store a response and revalidate it.
4. Keep the default full-URL cache key. The query string is part of the key
   because supported catalog search and filter variants can have different
   initial HTML.
5. Do not add cookies, authorization values, or device details to the cache key.

Analytics cookies do not make public content private. They do not need a cache
key dimension. The Markdown request bypass must run before cache lookup because
the default cache key does not vary on `Accept`.

The status rule is mandatory. A request rule cannot see the final response
status. Without the status rule, Cloudflare can store a missing listing or an
upstream error response.

Cloudflare documents the relevant controls in its guides for
[Cache Rule settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/),
[cache keys](https://developers.cloudflare.com/cache/how-to/cache-keys/), and
[status-code TTL](https://developers.cloudflare.com/cache/how-to/configure-cache-status-code/).

## Invalidation ownership

The storefront deployment owner purges the
`daylily-storefront-public-html` tag after a successful storefront deployment.

A seller artifact publication is complete only after this ordered sequence:

1. Publish the new artifact manifest atomically.
2. Purge `daylily-storefront-data` in the Daylily Catalog API zone.
3. Purge `daylily-storefront-public-html` in every affected storefront zone.

Run this publication sequence every 24 hours. The health route reports a usable
snapshot that is older than 26 hours as stale and degraded, with HTTP 200. It
returns HTTP 503 only when no usable snapshot exists or required configuration
is invalid.

The public HTML tag covers public pages, public read APIs, machine documents,
and the sitemap in one storefront zone. Skipping a purge can make the 24-hour
data TTL and the 12-hour storefront TTL compound. After the purges, the
storefront deployment owner runs the preview checks below.

No storefront request handler purges Cloudflare. A failed deployment or failed
snapshot publish must not purge the tag.

## Preview proof gate

Before DNS changes, use a Cloudflare-proxied preview hostname and verify:

- Two equivalent anonymous document requests change from `MISS` to `HIT` and
  the second response has a positive `Age`.
- Two equivalent anonymous public read API requests change from `MISS` to `HIT`
  and the second response has a positive `Age`.
- Two equivalent machine discovery requests change from `MISS` to `HIT` and the
  second response has a positive `Age`.
- Two equivalent sitemap requests change from `MISS` to `HIT` and the second
  response has a positive `Age`.
- A stale entry can return `UPDATING`, and a later request returns `HIT`.
- Search page URLs and public API query variants keep separate full-URL cache
  entries.
- Cart, inquiry, health, mutation, React Server Component, prefetch, authorized,
  and session requests do not return cached responses.
- Missing listings, missing catalogs, and upstream errors are not stored.

Local and direct-origin tests can confirm headers. They cannot prove a
Cloudflare `MISS` to `HIT` transition.
