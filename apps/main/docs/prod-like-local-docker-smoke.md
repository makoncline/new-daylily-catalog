# Production-Like Local Docker Smoke

Use this when you need local code running in a production Docker build while
using production Clerk domains and a local SQLite copy of production data.

This workflow is intended for auth and routing regressions that only reproduce
on a real `*.daylilycatalog.com` origin. It does not use the embedded replica.

This is distinct from
[`realistic-data-local-development.md`](./realistic-data-local-development.md):

- Seeded realistic development runs `next dev` with stage Clerk, Stripe test
  mode, and the documented `prodlike+` personas.
- This workflow runs the actual production container with production service
  configuration and a local production database copy. Stage persona
  credentials do not apply here.

## What It Does

- Pulls the VPS runtime env from `/srv/stacks/daylilycatalog/.env`.
- Writes ignored local env files under `apps/main`.
- Overrides `DATABASE_URL` to use a local SQLite copy.
- Disables Sentry runtime collection and source-map processing, removes the
  build upload token, and uses the fixed local release `prod-like-local`.
- Comments out embedded replica env.
- Sets `PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS=0`.
- Creates an ignored Docker Compose override that mounts the local DB into
  `/data/daylilycatalog.sqlite`.
- Points only the `dev.daylilycatalog.com` entry in `~/.cloudflared/config.yml`
  at the local Docker port, preserving other tunnel ingress entries.

## Prerequisites

- OrbStack or Docker is running.
- `cloudflared` is authenticated for the existing `local` tunnel.
- `dev.daylilycatalog.com` is allowed by the production Clerk instance.
- Your SSH host can read `/srv/stacks/daylilycatalog/.env` on the VPS.
- The local production DB copy exists.

Create or refresh the local DB copy:

```sh
cd apps/main
CI=false pnpm env:dev bash scripts/db-backup.sh
```

From a linked worktree, perform the [exceptional full-snapshot copy](./db-backup-readme.md#linked-worktrees) before continuing.

That writes:

```txt
apps/main/prisma/local-prod-copy-daylily-catalog.db
```

## Prepare Local Files

From `apps/main`, run:

```sh
node scripts/prepare-prod-like-local-smoke.mjs --ssh-host <vps-ssh-host>
```

The remote env path defaults to:

```txt
/srv/stacks/daylilycatalog/.env
```

The tunnel hostname defaults to:

```txt
dev.daylilycatalog.com
```

If you already have `apps/main/.env.production` and only want to regenerate the
local override files from it:

```sh
node scripts/prepare-prod-like-local-smoke.mjs --skip-env-pull
```

## Start Docker

```sh
docker compose \
  -f compose.local.yaml \
  -f local/compose.prod-like.override.yaml \
  up --build -d
```

The app binds to:

```txt
http://localhost:3012
```

## Start The Tunnel

The package script can run the tunnel in the foreground:

```sh
pnpm start-tunnel
```

For longer browser testing on this Mac, `launchctl` has been more reliable than
backgrounding `cloudflared` from a shell:

```sh
launchctl remove com.makon.daylily-prodlike-cloudflared 2>/dev/null || true
launchctl submit -l com.makon.daylily-prodlike-cloudflared -- \
  /opt/homebrew/bin/cloudflared \
  tunnel \
  --config /Users/makon/.cloudflared/config.yml \
  run \
  local
```

Confirm the tunnel is connected:

```sh
cloudflared tunnel info local
curl -I https://dev.daylilycatalog.com/
```

Open:

```txt
https://dev.daylilycatalog.com
```

Use the tunneled URL for Clerk testing. Plain `localhost` is useful for quick
HTTP checks, but it is not equivalent for production Clerk behavior.

## Auth Regression Smoke

Verify:

- Sign-in code entry leaves the Clerk modal instead of spinning forever.
- Refresh after sign-in still shows the user signed in.
- Sign-out completes.
- Browser console does not show protected `_rsc` fetches redirected to
  `accounts.daylilycatalog.com/sign-in`.

Quick unauthenticated RSC check:

```sh
curl -i 'http://localhost:3012/dashboard/listings?_rsc=test' \
  -H 'accept: text/x-component' \
  -H 'next-url: /dashboard' \
  -H 'sec-fetch-dest: empty'
```

Expected:

```txt
HTTP/1.1 404 Not Found
cache-control: no-store
```

There should be no `Location` header.

## Stop

```sh
docker compose -f compose.local.yaml -f local/compose.prod-like.override.yaml down
launchctl remove com.makon.daylily-prodlike-cloudflared
```

If you used foreground `pnpm start-tunnel`, stop the tunnel with `Ctrl+C`
instead of `launchctl remove`.
