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
- `PUBLIC_STOREFRONT_ARTIFACT_ROOT` is the published storefront artifact root.
- `PUBLIC_STOREFRONT_SELLER_IDS` is the comma-separated, main-owned seller publication allowlist. It must contain unique, nonempty user IDs and must never be populated by database discovery.

The image contains the protected refresh route, target-only artifact worker,
and ordered purge command. The repository does not install or enable the
systemd templates. Run the initial one-shot and enable the 24-hour timer only
after the owner gate below. Publication must succeed before any cache purge.

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

The source-controlled command is
`apps/main/scripts/refresh-public-storefront-artifacts.mjs`. The disabled
service template runs this command inside the existing `app` container. The
command calls a bearer-protected fixed loopback route. That route syncs the one
embedded libSQL replica, streams bounded seller pages to a target-only Node 20
worker, validates the shared storefront schema, and commits the atomic
artifact manifest. The command then purges the API tag and each site tag in
order. Do not install the service or timer until the owner approves it.

Set `STOREFRONT_ARTIFACT_REFRESH_TOKEN` in the main stack `.env`. The same
value protects the loopback route and is passed to the short-lived command.
`openssl rand -hex 32` creates an accepted token. Keep Cloudflare credentials
only in the mode-`0600` refresh environment. They are passed to the one-shot
container process and are not part of the long-lived app environment.

`daylily-storefront-data` belongs to the main catalog API zone. Cacheable
responses on each storefront hostname use
`daylily-storefront-public-html` instead.

The service loads `PUBLIC_STOREFRONT_SELLER_IDS` from the main stack's `/srv/stacks/daylilycatalog/.env`. Do not duplicate the allowlist in the systemd unit or refresh environment. It is separate from `STOREFRONT_SELLER_ID` in each site stack. Do not discover all users. A new site needs both an allowlisted artifact and an approved site definition, service, domain, and Cloudflare cache rule.

The mode-`0600` refresh environment defines two purge boundaries:

- `STOREFRONT_API_CLOUDFLARE_ZONE_ID` and `STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN` apply only to the main API zone.
- `STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON` is an array that maps each approved site key and seller ID to its active hostname, zone ID, distinct purge token, and HTML cache tag. The initial array contains only seller `3`, `rolling-oaks`, and `rolling-oaks-daylilies.makon.dev`.

Do not reuse the API token as a site token. Do not reuse one site's token for another site.

The one-shot command does these steps in this order:

1. Read the seller allowlist from the main stack environment. Resolve every seller to one version-controlled approved site identity and one active purge target. Require nonempty API and site zone IDs and tokens. Fail before refresh if any value is missing, duplicated, extra, unapproved, or inconsistent.
2. Authenticate to the fixed loopback route before artifact work starts.
3. Sync the existing embedded replica. Page seller `3` through the singleton Prisma client and stream bounded public rows to the target worker. The target never opens the replica.
4. Validate the complete artifact with `@daylily-catalog/storefront-contract`. Publish immutable data with atomic renames in `/data/storefronts`. Commit the manifest last.
5. Purge `daylily-storefront-data` in the API zone only after the manifest commit succeeds.
6. After the API purge succeeds, purge `daylily-storefront-public-html` in each affected site's own zone with that site's token.
7. Return a nonzero status if authentication, sync, build, publication, target validation, or purge fails. Do not start a later purge after an earlier failure.

The operation gives the loopback refresh 15 minutes and each Cloudflare purge 30 seconds. The example service stops the complete run after 30 minutes. It retries a failed run after 15 minutes and stops after four starts in six hours. A timeout or purge failure must cause a retry. Connect the final service failure to deployment alerting before enablement. Do not accept a failed purge as a successful refresh. The seven-day stale window can otherwise serve data that is almost nine days old.

The image runs `tini` as container PID 1. The Node app is its child. An
internal 14-minute watchdog can therefore stop a hung replica sync before the
loopback deadline. If a target worker exists, the watchdog stops that worker
before it stops the Node app. `tini` then exits, and the Compose
`restart: unless-stopped` policy starts a clean app process. The next systemd
retry can start new refresh work. Do not run Node as container PID 1. A process
in the same Linux PID namespace cannot send `SIGKILL` to PID 1.

The example timer runs daily and permits up to two hours of jitter. Storefront health must degrade when its serving artifact is more than 26 hours old. The live Cloudflare file must have mode `0600`. It contains separate API and per-site purge credentials.

The main stack receives `STOREFRONT_INQUIRY_TOKENS_JSON`. It maps each approved seller ID to a distinct bearer token. The initial map has only key `3`. The Rolling Oaks site stack receives only its matching token as `STOREFRONT_INQUIRY_TOKEN`. Do not reuse a token between sellers. Do not put real values in source control.

Owner gate:

1. Review and merge the artifact builder, API endpoint, fixed seller allowlist, protected loopback route, one-shot command, and atomic publication.
2. Prove the API-zone data purge followed by per-site-zone HTML purges with distinct stub credentials.
3. Prove that a missing target or failed purge stops later purges, returns a nonzero status, retries, and sends an alert.
4. Build the initial seller `3` artifact. Verify the API and the 26-hour storefront health threshold.
5. Add the live loopback token and distinct Cloudflare inputs.
6. Get separate owner approval to install and enable the service and timer.

These templates do not enable a timer, call Cloudflare, add a token, or change production.
