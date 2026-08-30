# Storefront VPS deploy assets

This directory is the deploy source of truth for the first Rolling Oaks storefront stack.

## Deployment boundary

- Image: `ghcr.io/makoncline/daylily-storefront`
- Stack: `/srv/stacks/rolling-oaks-daylilies`
- Docker service: `rolling-oaks-storefront`
- Internal port: `3000`
- Health path: `/api/health`
- Initial host: `rolling-oaks-daylilies.makon.dev`

The image is generic. The live `.env` file sets `STOREFRONT_SELLER_ID`. Do not put a seller ID in source, the Dockerfile, an image tag, or a workflow matrix.

The storefront has no database credentials and no local catalog snapshot. It reads `GET /api/v1/storefronts/{sellerId}` from `STOREFRONT_API_BASE_URL`.

## Server paths

- `apps/storefront/deploy/vps/compose.yaml` -> `/srv/stacks/rolling-oaks-daylilies/compose.yaml`
- `apps/storefront/deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/30-rolling-oaks-storefront.caddy`
- `apps/storefront/deploy/vps/.env.example` -> reference only
- Live environment -> `/srv/stacks/rolling-oaks-daylilies/.env`

The service joins the shared external `edge` network. Its service name is unique. Do not rename it to `app`. The main catalog already uses that network alias.

## Storefront artifact prerequisite

The main catalog owns the source data and the storefront artifact builder. Before the storefront becomes available:

1. Provision `/srv/stacks/daylilycatalog/data/storefront-artifacts` in the main stack data path. The main container sees this path as `/data/storefront-artifacts`.
2. Build the first artifact from the main embedded replica.
3. Write a new artifact to a temporary file in the same directory. Rename it to the live file only after a successful build.
4. Run one refresh at a time every 24 hours. Do not run parallel refreshes.
5. Make the main API endpoint serve only the last complete artifact.

This change does not add or enable a production scheduler. The first artifact, the serial refresh job, and its monitoring are owner-controlled deployment prerequisites.

## Staged release

The storefront workflow builds, tests, and publishes an immutable `main-<short-sha>` image when storefront or dependency-affected shared inputs change. It does not deploy the image. The image build uses fixture data and the stub inquiry adapter. It does not need seller or production data credentials.

Before automatic deployment is enabled, the owner must:

1. Remove any application default for `STOREFRONT_SELLER_ID`. Production must fail when this value is absent.
2. Complete the artifact prerequisites above.
3. Install the stack files and live `.env` on the VPS.
4. Register the `rolling-oaks-daylilies` config-sync and deploy targets in the deployment gateway.
5. Set the config-sync target to `CONFIG_SUBDIR=apps/storefront/deploy/vps`.
6. Provide and verify the HTTP inquiry endpoint. It must return `id` and `acceptedAt` for an accepted JSON request.
7. Validate the initial Caddy route and Cloudflare Tunnel hostname.
8. Configure and verify the Cloudflare cache rule below.
9. Get explicit owner approval before a workflow sends a deploy token or changes the running stack.

Webhook registration and workflow enablement are later cutover steps. This change does not add or call a production deployment webhook.

## Cloudflare page cache

The storefront application must set these headers only on successful, anonymous public HTML responses:

```http
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-public-html
```

Create a cache rule for the storefront hostname with these settings:

- Use a request expression that allows only anonymous public `GET` and `HEAD` document routes. Bypass all other requests.
- Set the allowed routes to `Eligible for cache`.
- Let the explicit origin header set the edge TTL. Do not add a catch-all edge TTL.
- Keep the default full-URL cache key.
- Let the browser respect the origin browser-cache headers.
- Set status codes `400-599` to no-store with `value: -1`. Do not use `0`; that value permits storage and revalidation.

The rule expression must bypass excluded requests even if Next sets an ordinary cacheable `Cache-Control` header. Do not use header omission as the only bypass control.

Do not cache `/cart`, `/contact`, `/thanks`, `/api/**`, form, inquiry, health, error, authenticated, personalized, RSC, prefetch, or `Accept: text/markdown` responses. Do not cache methods other than `GET` and `HEAD`. The default cache key does not vary by `Accept`, so the Markdown bypass must occur before cache lookup. The main catalog and storefront use separate cache tags.

Before cutover, request one eligible page twice through Cloudflare. Verify `MISS` and then `HIT`, with a positive `Age` value. Verify that each excluded route bypasses cache and has no positive `Age` value.

A future successful storefront deployment can purge only `daylily-storefront-public-html`. Purge the storefront hostname once when the tagged cache policy first becomes available. This change does not create a purge token, cache rule, or purge call.

Cloudflare references:

- [Cloudflare CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
- [Cloudflare stale content and revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/)
- [Cloudflare cache keys](https://developers.cloudflare.com/cache/how-to/cache-keys/)

## Canonical-domain cutover

Keep `rolling-oaks-daylilies.makon.dev` as the non-cutover target. The later public cutover can use `rollingoaksdaylilies.com` as the canonical host and redirect `www.rollingoaksdaylilies.com` to it.

Use explicit hostname routes. One existing named Cloudflare Tunnel can route both the catalog and storefront hostnames to the shared Caddy origin. Each public hostname still needs its own DNS route to the tunnel. Keep the storefront Caddy matcher and Docker service separate from the catalog route.

For the cutover:

1. Add the apex and `www` DNS routes to the existing tunnel in the storefront domain zone.
2. Add the apex to this Caddy host matcher and add a `www` redirect to the apex.
3. Validate the Cloudflare ingress order and final catch-all rule.
4. Validate the Caddy configuration before reload.
5. Confirm `/api/health` and the storefront smoke tests on the non-cutover host.
6. Change public DNS only after a separate owner decision.

Do not add `rolling-oaks.daylilycatalog.com` unless the owner selects that hostname separately. Do not use a wildcard DNS or tunnel rule for the first storefront.
