# VPS Deployment

The app runs in one Docker container behind the Cloudflare tunnel and Caddy.
The tracked server files are in `apps/main/deploy/vps/`. Use the configured
stack directory and proxy site directory on the server.

## External setup

- Configure the GitHub Actions `production`, `preview`, and `ops` environments with the names used in `.github/workflows/`. The `ops` environment needs AWS S3 and Turso backup credentials. Keep secrets out of tracked files.
- Point the apex and `prod.daylilycatalog.com` Cloudflare DNS records to the app tunnel. Redirect `www.daylilycatalog.com` to the apex. Keep `APP_BASE_URL=https://daylilycatalog.com` for canonical links.
- Allow both the apex and `prod.daylilycatalog.com` in Clerk during a parallel rollout. Configure Stripe's live webhook for the intended host. Checkout and billing portal returns use the request host.
- Keep monthly and yearly Stripe prices on one active product, in one currency. Set `daylily_catalog_pro_monthly_checkout` on the monthly price and select the yearly price as its upsell. Do not add a trial. When an amount changes, create a new price and transfer the lookup key or upsell; existing subscriptions keep their prices.
- Keep all production app values in the 1Password Environment "Daylily — Production". `apps/main/.env.schema` declares the variable names. The deploy hook writes the VPS runtime `.env` and sets `IMAGE_TAG` to an immutable `main-<shortsha>` tag.

## Server installation

1. Copy `apps/main/deploy/vps/compose.yaml` to the configured stack directory as `compose.yaml`.
2. Copy `apps/main/deploy/vps/caddy-route.caddy` to the configured proxy site directory. If server config sync is active, point it at `apps/main/deploy/vps`.
3. Create `next-cache` in the stack directory with write access for the container user.
4. Run `/usr/local/bin/daylily-env-sync render <tag>` to create the runtime `.env`. Run `docker compose up -d` from the configured stack directory. Reload Caddy after route changes.
5. Install or update the tracked search service and timer separately from the app image. Follow the [search index procedure](search-candidate-rollout.md).

Keep `DATABASE_URL` on the remote `libsql://` Turso database. Set
`TURSO_EMBEDDED_REPLICA_URL=file:/data/turso-replica.db` for lag-tolerant public
reads. Dashboard reads and writes use the primary database. The Compose volume
keeps the replica and search artifact across container replacement.

Main branch CI publishes an immutable image and calls the configured deploy
webhook after the push. PR CI builds an image for verification without
publishing it. The tracked Docker workflow contains the webhook request
contract and reads its bearer token from GitHub Actions secrets.

## Production values and updates

All production app values, public and secret, live in the 1Password Environment
"Daylily — Production" (`kbms3dbpzhwvwiicxcnuh64uoa`). The Docker build and the
VPS deploy hook both read it. The `production` GitHub environment needs the
read-only `DAYLILY_OP_SERVICE_ACCOUNT_TOKEN` secret. The build requires
`SENTRY_AUTH_TOKEN` in 1Password. PR builds use the `preview` GitHub environment.

The build sends only the selected build values through a BuildKit secret.
The VPS deploy hook runs `/usr/local/bin/daylily-env-sync render <tag>` before
`docker compose up`. This writes `/srv/stacks/daylilycatalog/.env` from
1Password for the selected image.

To change a value, edit it in "Daylily — Production". Then re-run the latest
main "Docker Image" workflow, or ask the server agent to run
`daylily-env-sync apply`. The `apply` command refreshes the env and restarts
the app with the current image.

For a build-only check, run "Docker Image" manually with `build_env_dry_run`
set to `true`. It builds from 1Password and runs the image smoke checks without
an image push or deploy.

In an emergency, a direct edit to the server `.env` works until the next deploy.
The deploy overwrites the file. Put the same change in 1Password.

## Rollback

A failed smoke check automatically restores the previous `.env` and image.
For other rollbacks, redeploy an earlier image tag or restore
`.env.before-deploy` and run `docker compose up -d` from the stack directory.
The `next-cache` volume survives normal image changes. Clear it only when a
specific cache problem requires it.

Use the [local production container smoke](prod-like-local-docker-smoke.md)
before a change that needs production-shaped auth or routing proof.
After an authorized live checkout test, use the
[test account cleanup procedure](production-test-account-cleanup.md).
