# VPS Deployment

The app runs in one Docker container behind the Cloudflare tunnel and Caddy.
The tracked server files are in `apps/main/deploy/vps/`. Use the configured
stack directory and proxy site directory on the server.

## External setup

- Configure the GitHub Actions `production`, `preview`, and `ops` environments with the names used in `.github/workflows/` and `apps/main/deploy/vps/.env.example`. The `ops` environment needs AWS S3 and Turso backup credentials. Keep secrets out of tracked files.
- Point the apex and `prod.daylilycatalog.com` Cloudflare DNS records to the app tunnel. Redirect `www.daylilycatalog.com` to the apex. Keep `APP_BASE_URL=https://daylilycatalog.com` for canonical links.
- Allow both the apex and `prod.daylilycatalog.com` in Clerk during a parallel rollout. Configure Stripe's live webhook for the intended host. Checkout and billing portal returns use the request host.
- Keep monthly and yearly Stripe prices on one active product, in one currency. Set `daylily_catalog_pro_monthly_checkout` on the monthly price and select the yearly price as its upsell. Do not add a trial. When an amount changes, create a new price and transfer the lookup key or upsell; existing subscriptions keep their prices.
- Keep the VPS runtime values in the configured stack directory's `.env`. Set `IMAGE_TAG` to an immutable `main-<shortsha>` tag. Use the tracked `.env.example` for the variable names.

## Server installation

1. Copy `apps/main/deploy/vps/compose.yaml` to the configured stack directory as `compose.yaml`.
2. Copy `apps/main/deploy/vps/caddy-route.caddy` to the configured proxy site directory. If server config sync is active, point it at `apps/main/deploy/vps`.
3. Create `next-cache` in the stack directory with write access for the container user.
4. Set the runtime `.env` and run `docker compose up -d` from the configured stack directory. Reload Caddy after route changes.
5. Install or update the tracked search service and timer separately from the app image. Follow the [search index procedure](search-candidate-rollout.md).

Keep `DATABASE_URL` on the remote `libsql://` Turso database. Set
`TURSO_EMBEDDED_REPLICA_URL=file:/data/turso-replica.db` for lag-tolerant public
reads. Dashboard reads and writes use the primary database. The Compose volume
keeps the replica and search artifact across container replacement.

Main branch CI publishes an immutable image and calls the configured deploy
webhook after the push. PR CI builds an image for verification without
publishing it. The tracked Docker workflow contains the webhook request
contract and reads its bearer token from GitHub Actions secrets.

To roll back, set `IMAGE_TAG` to a previous published tag in the live `.env`
and run `docker compose up -d`. The `next-cache` volume survives normal image
changes. Clear it only when a specific cache problem requires it.

Use the [local production container smoke](prod-like-local-docker-smoke.md)
before a change that needs production-shaped auth or routing proof.
After an authorized live checkout test, use the
[test account cleanup procedure](production-test-account-cleanup.md).
