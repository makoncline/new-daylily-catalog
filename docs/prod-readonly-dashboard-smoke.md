# Production Read-Only Dashboard Smoke

Use this when local SQLite timing is not enough and you need to test dashboard
read paths against the real production Turso database before waiting on PR
checks and a Vercel deploy.

This workflow is for read-only dashboard bootstrap/sync validation. Do not use
it for mutations, data edits, imports, Prisma migrations, `prisma db push`, or
one-off write scripts.

## Goal

- Run the local app code on your machine.
- Point it at production Turso data.
- Serve it from a real `daylilycatalog.com` subdomain so production Clerk
  login works.
- Exercise only dashboard read paths such as:
  - `dashboardDb.listing.sync`
  - `dashboardDb.list.sync`
  - `dashboardDb.image.sync`
  - `dashboardDb.cultivarReference.sync`

## 1. Use a Dedicated Local Environment File

Never edit or commit tracked env files for this. Use an ignored file:

```sh
vercel env pull .env.production-readonly.local
```

Then review it before use. Keep production write-capable credentials out of
shell history and issue trackers.

If Turso can provide a read-only database token, replace the pulled production
database token with the read-only token before running this workflow. If the
token is not read-only, treat the whole browser session as production access and
only run read-only routes.

## 2. Pick a Local Production Hostname

Use a hostname under `daylilycatalog.com`, for example:

```txt
local-readonly.daylilycatalog.com
```

This hostname must be allowed by Clerk for the production app. Add it to the
production Clerk instance as an allowed origin/redirect target before testing,
then remove it when the smoke session is done if it is not meant to stay.

## 3. Point Cloudflare Tunnel at the Local App

The repo already has:

```sh
pnpm start-tunnel
```

That runs:

```sh
cloudflared tunnel run local
```

Configure the Cloudflare tunnel route so the chosen
`*.daylilycatalog.com` hostname forwards to the local Next.js port you will use
for this session, usually `http://localhost:3000`.

## 4. Run the Local App Against Production Turso

In one terminal:

```sh
pnpm start-tunnel
```

In another terminal:

```sh
PORT=3000 \
NEXT_PUBLIC_SENTRY_ENABLED=false \
pnpm env:dev npx dotenv -e .env.production-readonly.local -- pnpm dev
```

Open the Cloudflare hostname, not `localhost`, so Clerk sees the expected
production-style origin:

```txt
https://local-readonly.daylilycatalog.com/dashboard
```

## 5. Dashboard Timeout Smoke Checklist

Before opening the browser console, clear old deployment/runtime assumptions:
you are testing local code with production data and auth.

Watch the Network tab and server logs for these calls:

```txt
/api/trpc/dashboardDb.listing.sync
/api/trpc/dashboardDb.list.sync
/api/trpc/dashboardDb.image.sync
/api/trpc/dashboardDb.cultivarReference.sync
```

For each call, record:

- HTTP status
- wall-clock duration
- response size
- row count when visible in the response/logs

Treat any single dashboard sync route over roughly 7 seconds as risky for
Vercel's 10 second serverless limit, even if it eventually succeeds locally.
If a route is over that threshold, optimize that route specifically before
opening a PR.

## Safety Rules

- Do not click dashboard save/create/delete/reorder controls.
- Do not run mutation e2e tests against this environment.
- Do not run Prisma commands against this environment.
- Prefer direct read-only smoke scripts or manual page load checks.
- Stop the tunnel when done.

## Why This Exists

The largest production catalog can expose query shapes that local SQLite does
not penalize. A local app pointed at production Turso gives faster feedback on
whether a dashboard read route will threaten Vercel's per-function timeout,
without waiting for a full PR check and deploy cycle.
