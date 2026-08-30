# VPS Deploy Assets

- `compose.yaml`: stack file for `/srv/stacks/daylilycatalog`
- `caddy-route.caddy`: Caddy route for `daylilycatalog.com`, `www.daylilycatalog.com`, and `prod.daylilycatalog.com`
- `.env.example`: runtime env contract for the stack

These files are the deploy source of truth. Copy them directly to the server stack paths below.

Server paths:

- `apps/main/deploy/vps/compose.yaml` -> `/srv/stacks/daylilycatalog/compose.yaml`
- `apps/main/deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/20-daylilycatalog.caddy`
- `apps/main/deploy/vps/.env.example` -> reference only; live runtime env stays in `/srv/stacks/daylilycatalog/.env`

Embedded Turso replica:

- Leave `DATABASE_URL` set to the remote `libsql://...` Turso URL.
- Set `TURSO_EMBEDDED_REPLICA_URL=file:/data/turso-replica.db` on the VPS. This is the only embedded replica. It serves public page reads and search index builds. Dashboard reads and all writes continue to use Turso.
- `TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS` controls periodic pull sync. The template uses 600 seconds. Search rebuilds also sync the replica explicitly before source reads.
- Before each search index rebuild, the app explicitly syncs this replica. The app pages source rows through its singleton `replicaDb` connection and streams bounded pages to a target-only child. The child never opens the replica. Stock SQLite never opens or copies the replica file. The app server stays responsive while the child builds the local index.
- `PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS` controls the public search index rebuild cadence. Set it to `0` to stop rebuilds without rebuilding the image.
- Each build writes and validates `/data/search/public-search.sqlite.next`. A valid build replaces the serving index atomically, and the old serving index becomes `/data/search/public-search.sqlite.previous`.
- `compose.yaml` mounts `/srv/stacks/daylilycatalog/data` at `/data` so the replica and last-known-good search indexes survive container replacement.
- Before the first start, create both `data` and `next-cache` with UID and GID 1001 ownership. The active runbook has the exact `install -d` command.

Config sync:

- `/etc/bootstrap/config-sync/daylilycatalog.env` should set `CONFIG_SUBDIR=apps/main/deploy/vps`.
- The Next cache volume in `compose.yaml` should target `/app/apps/main/.next/cache`.

Deploy webhook:

```http
POST https://deploy.makon.dev/deploy/daylilycatalog
Authorization: Bearer <DEPLOY_WEBHOOK_TOKEN>
Content-Type: application/json

{"image_tag":"main-15f26026","clear_cache":false}
```
