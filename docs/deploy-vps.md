# VPS Deployment

This app is prepared for a single-container Docker deployment behind Cloudflare Tunnel and internal Caddy.

## Runtime Contract

- Internal app port: `3000`
- Container start command: `node server.js`
- Container bind address: `0.0.0.0`
- Recommended database mode: Turso (`USE_TURSO_DB=true`)

## Required Runtime Environment Variables

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

- Recommended Turso deployment: none
- Optional local SQLite deployment: mount a persistent volume to `/data`

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
docker build --secret id=app_env,src=.env -t ghcr.io/makoncline/daylilycatalog:latest .
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

## Server Compose

```yaml
services:
  app:
    image: ghcr.io/makoncline/daylilycatalog:latest
    restart: unless-stopped
    env_file:
      - .env
    networks:
      - edge

networks:
  edge:
    external: true
```

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

## Server Bundle

Generate a minimal server bundle with only the runtime stack files:

```sh
pnpm deploy:bundle
```

This writes:

- `.server-deploy/compose.yaml`
- `.server-deploy/.env` generated from `.env.production` when available
- `.server-deploy/caddy-route.caddy`

The generated `.env` keeps only runtime vars used by the VPS stack. It excludes Vercel-only and build-only keys.
The directory is gitignored and can be copied to the server as a starting point for `/srv/stacks/daylilycatalog`.

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
2. Create `.env` from `.env.example` with production values.
3. Build the image with the command above.
4. Start the stack with `docker compose up -d`.
5. Add the Caddy route block for `vps-test.daylilycatalog.com`.
