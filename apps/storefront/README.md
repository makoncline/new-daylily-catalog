# Generic seller storefront

This Next.js app renders a seller-owned daylily storefront. Rolling Oaks is the first brand configuration. The app does not read the catalog database directly.

## Data boundary

Production reads one versioned snapshot:

```text
GET {STOREFRONT_API_BASE_URL}/api/v1/storefronts/{STOREFRONT_SELLER_ID}
```

`STOREFRONT_SELLER_ID` is a server-only `User.id`. Production and every remote
data-source deployment must set it. The app has no production seller default.
Production rejects the fixture source. The Rolling Oaks site definition expects
seller ID `3` and the approved apex, `www`, or preview hostname. Production
requires `STOREFRONT_SITE_KEY`, `STOREFRONT_HOSTNAME`, and
`STOREFRONT_SELLER_ID`, and it rejects any brand, host, or seller mismatch.
The remote adapter validates the complete version 1 response, including its
top-level `generatedAt` value, before it serves it. It sends `If-None-Match`
after a successful response and can serve its in-process last-known-good
snapshot when a later request fails. Local development and tests use a
deterministic fixture adapter with the first brand's fixture seller.

The main app's atomically published artifact is the durable data source.
Cloudflare stale caching and the storefront adapter's in-process
last-known-good value add read resilience. The storefront does not own a
persistent snapshot volume. A cold storefront process returns HTTP 503 when the
main API and edge cache are unavailable.

## Local development

From the repository root:

```bash
pnpm install
pnpm storefront dev
```

The fixture adapter is the default outside production. Copy `.env.example` only when you need explicit values.

## Inquiry boundary

The storefront sends contact and cart inquiries to an HTTP adapter. It does not
own SMTP credentials and it does not send customer email. Use
`STOREFRONT_INQUIRY_ADAPTER=stub` only in local development and tests.
Production rejects the stub adapter. Production must use `remote` and set
`STOREFRONT_INQUIRY_TOKEN`. The app derives the seller-scoped receiver path from
`STOREFRONT_API_BASE_URL` and `STOREFRONT_SELLER_ID`. It forwards only a valid
single IP address from Cloudflare's trusted `CF-Connecting-IP` header. The
origin must not be directly reachable, and the edge must replace that header.
The app does not trust browser `X-Forwarded-For`, `X-Real-IP`, or
`X-Storefront-Client-IP` values. Configuration checks do not contact the
delivery service.

## Public machine contract

The public read and inquiry routes are:

- `GET /api/catalogs`
- `GET /api/catalog/{catalog}`
- `GET /api/listings/{listing}`
- `POST /api/forms`
- `GET /api/health`

Discovery documents are available at `/.well-known/api-catalog`,
`/openapi.json`, `/llms.txt`, and `/.well-known/agent-skills/index.json`. The
skill index links to the four public skill documents. Public page routes also
return a Markdown representation when an exact-route `GET` or `HEAD` request
uses `Accept: text/markdown`.

## Public HTML cache

Anonymous public documents send the same 12-hour Cloudflare edge policy as the
main app. Cart, inquiry, health, React Server Component, prefetch, credentialed,
and error responses stay out of the edge cache. The required Cache Rule,
status-code guard, purge ownership, and preview proof gate are in
[`docs/cloudflare-public-html-cache.md`](docs/cloudflare-public-html-cache.md).

## Deployment contract

- Package: `@daylily-catalog/storefront`
- Dockerfile: `apps/storefront/Dockerfile`
- Health: `GET /api/health`
- Ready and degraded-but-serving states return HTTP 200. The publication target
  is one new snapshot every 24 hours. A usable snapshot that is older than 26
  hours stays available but reports `freshness: "stale"` and a degraded status.
- Missing or invalid data and inquiry-delivery configuration returns HTTP 503.

The deployment uses one generic image and one isolated container for each
approved seller. Rolling Oaks is the first service. To add a seller, add the
seller to the main-owned artifact allowlist, add a version-controlled site
definition here, create a separate service with its seller and delivery
environment, and add that host's Cloudflare cache rule. All seller services use
the same image. Do not add a multi-seller runtime registry to one container.

Before production traffic reaches `POST /api/forms`, configure and verify an
edge rate limit for that route. The app's honeypot and timing checks are not a
replacement for an edge request limit. Do not cache form responses.

Do not connect a second Vercel Git project until the repository preview workflows are scoped to the main Vercel project. The current deployment-status workflows can otherwise run the main test suite against this app.
