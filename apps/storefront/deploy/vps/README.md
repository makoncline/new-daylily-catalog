# Storefront VPS deploy assets

This directory is the deploy source of truth for the first Rolling Oaks storefront stack.

## Deployment boundary

- Image: `ghcr.io/makoncline/daylily-storefront`
- Stack: `/srv/stacks/rolling-oaks-daylilies`
- Docker service: `rolling-oaks-storefront`
- Internal port: `3000`
- Health path: `/api/health`
- Initial host: `rolling-oaks-daylilies.makon.dev`
- Persistent snapshot: `/srv/stacks/rolling-oaks-daylilies/public-data`

The image is generic. Set `STOREFRONT_SELLER_ID` in the live stack `.env` file. Do not put the seller ID in source, the Dockerfile, an image tag, or a workflow matrix.

## Server paths

- `apps/storefront/deploy/vps/compose.yaml` -> `/srv/stacks/rolling-oaks-daylilies/compose.yaml`
- `apps/storefront/deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/30-rolling-oaks-storefront.caddy`
- `apps/storefront/deploy/vps/.env.example` -> reference only
- Live environment -> `/srv/stacks/rolling-oaks-daylilies/.env`

Create the writable snapshot directory before the first container starts:

```sh
install -d -o 1001 -g 1001 /srv/stacks/rolling-oaks-daylilies/public-data
```

The service joins the shared external `edge` network. Its service name is unique. Do not rename it to `app`; the main catalog already uses that network alias.

## Staged release

The storefront workflow builds, tests, and publishes an immutable `main-<short-sha>` image when storefront or shared inputs change. It does not deploy the image.

Before automatic deployment is enabled, the owner must:

1. Create the `storefront-preview` and `storefront-production` GitHub environments.
2. Put `STOREFRONT_SELLER_ID`, Turso access, and only storefront secrets in those environments.
3. Register the `rolling-oaks-daylilies` config-sync and deploy targets in the deployment gateway.
4. Set the config-sync target to `CONFIG_SUBDIR=apps/storefront/deploy/vps`.
5. Install the stack files and live `.env` on the VPS.
6. Validate the initial Caddy route and Cloudflare Tunnel hostname.
7. Get explicit owner approval before a workflow sends the deploy token or changes the running stack.

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
