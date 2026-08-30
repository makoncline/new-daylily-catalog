# VPS Deploy Assets

- `compose.yaml`: stack file for `/srv/stacks/daylilycatalog`
- `caddy-route.caddy`: Caddy route for `daylilycatalog.com`, `www.daylilycatalog.com`, and `prod.daylilycatalog.com`
- `.env.example`: runtime env contract for the stack
- `storefront-artifact-refresh.service.example`: disabled one-shot refresh service template
- `storefront-artifact-refresh.timer.example`: disabled daily timer template
- `storefront-artifact-refresh.env.example`: live Cloudflare input contract for the refresh service

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

## Storefront artifact refresh

The artifact implementation has not set its final command. The service template uses `/srv/stacks/daylilycatalog/bin/storefront-artifact-refresh` as the integration point. Do not create a local replacement for this command. Do not install the service or timer until the implementation adds a source-controlled one-shot command and the owner approves it.

The service template supplies these fixed inputs:

- `PUBLIC_STOREFRONT_SELLER_IDS=3`
- `STOREFRONT_DATA_CACHE_TAG=daylily-storefront-data`
- `STOREFRONT_HTML_CACHE_TAGS=daylily-storefront-public-html`

`PUBLIC_STOREFRONT_SELLER_IDS` is the main-owned publication allowlist. It is separate from `STOREFRONT_SELLER_ID` in each site stack. Do not discover all users. A new site needs both an allowlisted artifact and an approved site definition, service, domain, and Cloudflare cache rule.

The one-shot command must do these steps in this order:

1. Take an exclusive refresh lock. A second run must not start.
2. Build seller `3` from the main embedded replica into a temporary file in `/srv/stacks/daylilycatalog/data/storefront-artifacts`.
3. Validate the complete artifact. Publish it with an atomic rename in the same file system. Commit the new manifest last.
4. Purge `daylily-storefront-data` only after the manifest commit succeeds.
5. Purge each affected `daylily-storefront-public-html` tag only after the data purge succeeds.
6. Return a nonzero status if a build, publication, or purge step fails.

The example service retries a failed run after 15 minutes. It stops after four starts in six hours. A purge failure must cause a retry. Connect the final service failure to deployment alerting before enablement. Do not accept a failed purge as a successful refresh. The seven-day stale window can otherwise serve data that is almost nine days old.

The example timer runs daily and permits up to two hours of jitter. Storefront health must degrade when its serving artifact is more than 26 hours old. The live Cloudflare file must have mode `0600`. It contains the zone ID and a cache-purge token.

The main stack receives `STOREFRONT_INQUIRY_TOKENS_JSON`. It maps each approved seller ID to a distinct bearer token. The initial map has only key `3`. The Rolling Oaks site stack receives only its matching token as `STOREFRONT_INQUIRY_TOKEN`. Do not reuse a token between sellers. Do not put real values in source control.

Owner gate:

1. Merge the artifact builder, the API endpoint, the fixed seller allowlist, the exclusive lock, and atomic publication.
2. Add the source-controlled one-shot command at the template integration point, or update the template to its final reviewed path.
3. Prove the ordered data and HTML tag purges with a non-production zone or a stub.
4. Prove that a purge failure returns a nonzero status, retries, and sends an alert.
5. Build the initial seller `3` artifact. Verify the API and the 26-hour health threshold.
6. Get separate owner approval to install and enable the timer and to add the live Cloudflare inputs.

These templates do not enable a timer, call Cloudflare, add a token, or change production.
