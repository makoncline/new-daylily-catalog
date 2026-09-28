# Production-Like Local Docker Smoke

Use this for auth or routing behavior that needs the production container and
a real `*.daylilycatalog.com` origin. The app uses a local production database
copy. The seeded development path uses stage Clerk and Stripe test mode, so it
cannot prove production-origin auth behavior.

## Prepare

The run needs Docker, an authenticated Cloudflare tunnel, a hostname allowed
by production Clerk, SSH read access to the configured server `.env`, and a
local production database copy. From the repository root, refresh that copy:

```sh
CI=false pnpm env:dev bash scripts/db-backup.sh
```

For a linked worktree, follow the [snapshot copy step](db-backup-readme.md#linked-worktrees).
Then prepare ignored local env and Compose files. Give the script the configured
server env path rather than relying on its default:

```sh
pnpm main exec node scripts/prepare-prod-like-local-smoke.mjs \
  --ssh-host "<ssh-host>" \
  --remote-env "<configured-stack-dir>/.env"
```

The script uses the local database, disables Sentry reporting and source-map
uploads, and removes embedded-replica settings. It changes only the selected
tunnel hostname in the local Cloudflare tunnel config. Review the generated
files before starting the container. Build a local search artifact separately
if the smoke needs search.

## Run and check

```sh
cd apps/main
docker compose -f compose.local.yaml -f local/compose.prod-like.override.yaml up --build -d
pnpm start-tunnel
```

The tunnel command runs in the foreground. Use the tunneled hostname for Clerk
tests; a localhost request does not prove the same auth behavior. Check that
sign-in completes, the session survives refresh, sign-out completes, and
protected component requests do not redirect to Clerk sign-in. Inspect the
browser console for related errors.

## Stop

Stop the foreground tunnel with `Ctrl+C`, then stop the local container:

```sh
docker compose -f compose.local.yaml -f local/compose.prod-like.override.yaml down
```
