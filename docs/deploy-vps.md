# VPS Deployment

This app is prepared for a single-container Docker deployment behind Cloudflare Tunnel and internal Caddy.

## Image Strategy

Immutable image tags are the deploy unit.

- Pull request builds verify Docker image creation with `pr-<number>-<shortsha>` tags and do not push or deploy.
- Main branch builds publish `main-<shortsha>` images.
- `latest` can still move as a convenience alias.
- The VPS should deploy by setting `IMAGE_TAG` in `.env`, not by relying on `latest`.
- After a successful image push on `main`, GitHub Actions calls the deploy webhook at `https://deploy.makon.dev/deploy/daylilycatalog`.
- Pull requests still run Docker image verification in the `preview` GitHub Environment, but server config sync and deploy stay gated to `push` on `main`.

## GitHub Actions Environments

This repo now uses environment-scoped GitHub Actions config instead of repo-level vars and secrets.

Required environment setup:

- `production` environment:
  - Variable: `APP_BASE_URL`
  - Variable: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Variable: `NEXT_PUBLIC_CLOUDFLARE_URL`
  - Variable: `STRIPE_PRICE_ID`
  - Variable: `TURSO_DATABASE_URL`
  - Secret: `TURSO_DATABASE_AUTH_TOKEN`
  - Secret: `STRIPE_SECRET_KEY` optional for cold-cache-safe production Docker builds
  - Secret: `DEPLOY_WEBHOOK_TOKEN`
- `preview` environment:
  - Variable: `APP_BASE_URL`
  - Variable: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Variable: `NEXT_PUBLIC_CLOUDFLARE_URL`
  - Variable: `STRIPE_PRICE_ID`
  - Variable: `TURSO_DATABASE_URL`
  - Variable: `VERCEL_TEAM`
  - Secret: `CLERK_SECRET_KEY`
  - Secret: `TURSO_DATABASE_AUTH_TOKEN`
  - Secret: `STRIPE_SECRET_KEY` optional for cold-cache-safe PR Docker verification builds
  - Secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
  - Secret: `VERCEL_TOKEN`
- `ops` environment:
  - Secret: `AWS_ACCESS_KEY_ID`
  - Secret: `AWS_SECRET_ACCESS_KEY`
  - Secret: `TURSO_API_TOKEN`

## Runtime Contract

- Internal app port: `3000`
- Container start command: `node server.js`
- Container bind address: `0.0.0.0`
- Recommended database mode: Turso (`USE_TURSO_DB=true`)

## Required Runtime Environment Variables

### Required for Compose image selection

- `IMAGE_TAG`

### Required in the recommended Turso deployment

Non-secrets:

- `APP_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLOUDFLARE_URL`
- `AWS_REGION`
- `AWS_BUCKET_NAME`
- `STRIPE_PRICE_ID`
- `USE_TURSO_DB=true`
- `TURSO_DATABASE_URL`

Secrets:

- `TURSO_DATABASE_AUTH_TOKEN`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Optional:

- `NEXT_PUBLIC_SENTRY_ENABLED` (defaults to `true`; set to `false` if you want Sentry disabled)
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`)
- `SENTRY_AUTH_TOKEN`

### Optional local SQLite runtime mode

If you choose `USE_TURSO_DB=false`, set:

- `LOCAL_DATABASE_URL=file:/data/daylilycatalog.sqlite`

And mount a persistent volume at `/data`.

## Reverse Proxy Notes

The app already respects forwarded host and protocol headers when generating absolute URLs. Caddy should terminate HTTPS and proxy plain HTTP to the container on port `3000`.

## Volumes

- Persistent Next.js runtime cache:
  - `./next-cache:/app/.next/cache`
- Optional local SQLite deployment: mount a persistent volume to `/data`

Create the cache directory on the server before first deploy so the non-root app user can write to it:

```sh
install -d -o 1001 -g 1001 /srv/stacks/daylilycatalog/next-cache
```

## External Dependencies

- Turso/libSQL database if `USE_TURSO_DB=true`
- Clerk
- Stripe
- AWS S3 bucket for image storage
- Cloudflare image/CDN endpoint at `NEXT_PUBLIC_CLOUDFLARE_URL`
- Optional PostHog
- Optional Sentry source map upload during image builds

## Image Build

The Docker build prerenders static public routes and sitemap data, so build with the same env file you plan to run in production.

```sh
IMAGE_TAG=main-$(git rev-parse --short=8 HEAD)
docker build --secret id=app_env,src=.env -t ghcr.io/makoncline/daylilycatalog:${IMAGE_TAG} .
```

### Minimum Verified CI Build Env

For a non-Vercel CI build that still generates correct public metadata and sitemap URLs, the minimum verified env set is:

- `APP_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLOUDFLARE_URL`
- `NEXT_PUBLIC_SENTRY_ENABLED=false`
- `TURSO_DATABASE_URL`
- `TURSO_DATABASE_AUTH_TOKEN`

Notes:

- This minimum set was verified with both `next build` and `docker build`.
- `STRIPE_SECRET_KEY` was not required for the verified build against the current production DB state because subscription cache data already existed in the DB.
- If you need cold-cache-safe correctness for public route generation that depends on Stripe subscription state, include `STRIPE_SECRET_KEY` in the build env too.
- When the build runs on GitHub for a pull request, the workflow reads its build vars and secrets from the `preview` GitHub Environment instead of `production`.

## Server Compose

```yaml
services:
  app:
    image: ghcr.io/makoncline/daylilycatalog:${IMAGE_TAG}
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./next-cache:/app/.next/cache
    networks:
      - edge

networks:
  edge:
    external: true
```

Committed source: `deploy/vps/compose.yaml`

If you run local SQLite instead of Turso, add:

```yaml
    volumes:
      - ./data:/data
```

## Caddy Route

```caddy
@daylilycatalog host vps-test.daylilycatalog.com
handle @daylilycatalog {
  reverse_proxy app:3000
}
```

Committed source: `deploy/vps/caddy-route.caddy`

## Local Docker Compose Check

For local verification against the pulled Vercel production env, use the local override:

```sh
docker compose -f compose.local.yaml up --build
```

Notes:

- `compose.local.yaml` is for local testing only.
- It binds `localhost:3012` so you can open the app in a browser.
- Docker Compose correctly parses quoted values in `.env.production`, unlike `docker run --env-file`.

## Deploy Steps

1. Place the repo or deployment files at `/srv/stacks/daylilycatalog`.
2. Create the cache directory:

```sh
install -d -o 1001 -g 1001 /srv/stacks/daylilycatalog/next-cache
```

3. Copy `deploy/vps/compose.yaml` to `/srv/stacks/daylilycatalog/compose.yaml`.
4. Copy `deploy/vps/caddy-route.caddy` to `/srv/stacks/proxy/sites/20-daylilycatalog.caddy`.
5. Create `/srv/stacks/daylilycatalog/.env` from `deploy/vps/.env.example`.
6. Set `IMAGE_TAG` in `/srv/stacks/daylilycatalog/.env` to the immutable image tag you want to run.
7. Build and push the image, or use the CI-published image for that same tag.
8. Start the stack with `docker compose up -d`.
9. Reload the proxy if your server setup requires it after changing Caddy route files.

## Rollback

Rollback is just an image tag change:

1. Edit `/srv/stacks/daylilycatalog/.env`
2. Set `IMAGE_TAG` back to a previous immutable tag such as `main-99e41b7c`
3. Run `docker compose up -d`

## Cache Notes

`./next-cache:/app/.next/cache` keeps ISR and other Next runtime cache data across container recreations.

Caveats:

- Cache contents can outlive an app deploy. If you see stale ISR output or odd cache behavior after a significant app change, clear `/srv/stacks/daylilycatalog/next-cache` and redeploy.
- Reusing the cache across normal deploys is expected, but it is not a substitute for app-level invalidation when route behavior changes.
- `latest` is only a convenience alias. The recommended deployed source of truth is the immutable tag stored in `IMAGE_TAG`.
