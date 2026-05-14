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
- Set `TURSO_EMBEDDED_REPLICA_URL=file:/data/turso-replica.db` on the VPS to serve public page reads from the local replica while dashboard reads and all writes continue to go to Turso.
- `TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS` controls periodic pull sync; the template uses 600 seconds because only public pages read from the replica.
- `PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS` controls the public search source-replica sync/rebuild cadence; set it to `0` to stop search index rebuilds without rebuilding the image.
- `compose.yaml` mounts `/srv/stacks/daylilycatalog/data` at `/data` so the replica file survives container replacement.

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
