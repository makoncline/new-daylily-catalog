# Storefront VPS deploy assets

This directory is the deploy source of truth for the first Rolling Oaks storefront stack.

## Deployment boundary

- Image: `ghcr.io/makoncline/daylily-storefront`
- Stack: `/srv/stacks/rolling-oaks-daylilies`
- Docker service: `rolling-oaks-storefront`
- Internal port: `3000`
- Health path: `/api/health`
- Initial host: `rolling-oaks-daylilies.makon.dev`

The image is generic and is not bound to one seller. It contains the version-controlled approved-site definitions. The first live `.env` file selects one definition with `STOREFRONT_SITE_KEY=rolling-oaks`, `STOREFRONT_HOSTNAME=rolling-oaks-daylilies.makon.dev`, and `STOREFRONT_SELLER_ID=3`. Keep seller IDs only in approved-site definitions and deployment configuration. Do not put them in the Dockerfile, image tag, or workflow matrix.

The storefront has no database credentials and no local catalog snapshot. It reads `GET /api/v1/storefronts/{sellerId}` from `STOREFRONT_API_BASE_URL`.

## Server paths

- `apps/storefront/deploy/vps/compose.yaml` -> `/srv/stacks/rolling-oaks-daylilies/compose.yaml`
- `apps/storefront/deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/30-rolling-oaks-storefront.caddy`
- `apps/storefront/deploy/vps/.env.example` -> reference only
- Live environment -> `/srv/stacks/rolling-oaks-daylilies/.env`

The service joins the shared external `edge` network. Its service name is unique. Do not rename it to `app`. The main catalog already uses that network alias.

## Multi-site server model

Run one isolated service and container for each approved seller. All services can use the same generic image. Each service must have a unique stack directory, service name, live environment file, public hostname, Caddy matcher, Cloudflare cache rule, and deployment target. Do not select sellers from the request host in one shared process. Do not add a runtime host registry.

The version-controlled approved-site definition must bind the site key, seller ID, and allowed hostnames. The service must compare `STOREFRONT_SITE_KEY`, `STOREFRONT_HOSTNAME`, and `STOREFRONT_SELLER_ID` with that definition at startup. A missing value or mismatch must stop startup. Rolling Oaks is the only initial definition: key `rolling-oaks`, seller ID `3`, and allowed hostnames `rolling-oaks-daylilies.makon.dev`, `rollingoaksdaylilies.com`, and `www.rollingoaksdaylilies.com`. One container selects exactly one allowed hostname. The first live environment selects `rolling-oaks-daylilies.makon.dev`.

To add one approved site:

1. Get owner approval for the site key, main catalog `User.id`, hostnames, brand, and inquiry destination.
2. Add one version-controlled approved-site definition with that exact key, seller ID, and hostname set.
3. Add only that seller ID to the main artifact job allowlist. Build and verify its first artifact.
4. Create `/srv/stacks/<site-key>` with a unique `<site-key>-storefront` Compose service and live `.env` file.
5. Set the image tag, site key, hostname, seller ID, remote API values, inquiry adapter, and bearer token in that `.env` file.
6. Add an explicit Caddy host matcher for the unique service. Include the three forwarded HTTPS headers in this directory's Caddy route.
7. Add explicit Tunnel and DNS routes only after separate owner approval. Do not use a wildcard.
8. Add and verify one hostname-specific Cloudflare cache rule with the exclusions below.
9. Verify health, seller identity, brand, canonical links, inquiry delivery, and cache behavior.
10. Register separate config-sync and deploy targets. Keep automatic deployment disabled until the owner approves the cutover.

## Storefront artifact prerequisite

The main catalog owns the source data and the storefront artifact builder. Before the storefront becomes available:

1. Provision `/srv/stacks/daylilycatalog/data/storefronts` in the main stack data path. The main container sees this path as `/data/storefronts`.
2. Build the first artifact from the main embedded replica.
3. Write a new artifact to a temporary file in the same directory. Rename it to the live file only after a successful build.
4. Run one refresh at a time every 24 hours. Do not run parallel refreshes.
5. Use an explicit seller-ID allowlist. The initial allowlist contains only `3`. Do not discover all sellers from the database.
6. Make the main API endpoint serve only the last complete artifact.
7. After a manifest commit, purge `daylily-storefront-data` in the API zone. Only after that succeeds, purge `daylily-storefront-public-html` in each affected site's own zone with its distinct token. A missing target or purge failure must stop later purges, return a failure, alert, and retry.

The disabled templates in `apps/main/deploy/vps` define the 24-hour service contract and its two-hour jitter. Storefront health must degrade when the serving artifact is more than 26 hours old. The artifact command is not final. Do not install or enable the templates until the owner gate in the main VPS runbook passes.

## Staged release

The storefront workflow builds, tests, and publishes an immutable `main-<short-sha>` image when storefront or dependency-affected shared inputs change. It does not deploy the image. The image build uses fixture data and the stub inquiry adapter. It does not need seller or production data credentials.

Production derives `POST /api/v1/storefronts/{sellerId}/inquiries` from `STOREFRONT_API_BASE_URL`. Do not configure a second inquiry URL. The main service maps seller `3` to one distinct token in `STOREFRONT_INQUIRY_TOKENS_JSON`. Give this site service only that token as `STOREFRONT_INQUIRY_TOKEN`. Do not reuse the token for another seller. Keep the real value out of source control.

Before automatic deployment is enabled, the owner must:

1. Remove any application default for `STOREFRONT_SELLER_ID`. Production must fail when site identity is absent or does not match the approved-site definition.
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

Create one cache rule for the exact hostname selected by `STOREFRONT_HOSTNAME`. Use the same main-catalog rule shape:

- Match only that one hostname and anonymous `GET` and `HEAD` requests.
- Exclude an `Authorization` header and cookies named `__session` or starting with `__session_`. Do not exclude every cookie.
- Exclude `_rsc`, `RSC: 1`, `Accept: text/x-component`, browser prefetch headers, and `Accept: text/markdown` before cache lookup.
- Set matching requests to `Eligible for cache`.
- Use the explicit origin cache header and `bypass_by_default`. A response without `Cloudflare-CDN-Cache-Control` must bypass cache. Do not add a catch-all edge TTL.
- Keep the default full-URL cache key.
- Let the browser respect the origin browser-cache headers.
- Set status codes `400-599` to no-store with `value: -1`. Do not use `0`; that value permits storage and revalidation.

Do not add a route allowlist, API path list, dashboard exclusion list, or blanket cookie bypass to the Cloudflare rule. The origin owns the response cache policy. Every cacheable response on this storefront hostname, including HTML, public read APIs, machine documents, and the sitemap, uses the explicit Cloudflare header and `daylily-storefront-public-html` tag. The main catalog artifact endpoint uses `daylily-storefront-data` in its separate API zone. Unsafe, private, form, health, and personalized responses must omit the cacheable origin directive or send `no-store`. The edge credential, RSC, prefetch, Markdown, and status guards are defense in depth.

The default full-URL key keeps every filtered API, search, and pagination query separate. It does not vary by `Accept`, so the Markdown bypass must occur before cache lookup. The main catalog and storefront use separate cache tags.

Before cutover, request one eligible page twice through Cloudflare. Verify `MISS` and then `HIT`, with a positive `Age` value. Verify that each excluded route bypasses cache and has no positive `Age` value.

A future successful storefront deployment can purge only `daylily-storefront-public-html`. Purge the storefront hostname once when the tagged cache policy first becomes available. This change does not create a purge token, cache rule, or purge call.

Cloudflare references:

- [Cloudflare CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
- [Cloudflare stale content and revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/)
- [Cloudflare cache keys](https://developers.cloudflare.com/cache/how-to/cache-keys/)

## Canonical-domain cutover

Keep `rolling-oaks-daylilies.makon.dev` as the selected non-cutover target. The approved-site definition already permits the later apex and `www` hostnames, but this does not route or activate them. The later public cutover can select `rollingoaksdaylilies.com` as the canonical host and redirect `www.rollingoaksdaylilies.com` to it.

Use explicit hostname routes. One existing named Cloudflare Tunnel can route both the catalog and storefront hostnames to the shared Caddy origin. Each public hostname still needs its own DNS route to the tunnel. Keep the storefront Caddy matcher and Docker service separate from the catalog route.

For the cutover:

1. Add the apex and `www` DNS routes to the existing tunnel in the storefront domain zone.
2. Set `STOREFRONT_HOSTNAME=rollingoaksdaylilies.com`, validate the approved-site triple, add the apex to this Caddy host matcher, and add a `www` redirect to the apex.
3. Validate the Cloudflare ingress order and final catch-all rule.
4. Validate the Caddy configuration before reload.
5. Confirm `/api/health` and the storefront smoke tests on the non-cutover host.
6. Change public DNS only after a separate owner decision.

Do not add `rolling-oaks.daylilycatalog.com` unless the owner selects that hostname separately. Do not use a wildcard DNS or tunnel rule for the first storefront.
