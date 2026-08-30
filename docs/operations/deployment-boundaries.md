# Application deployment boundaries

The monorepo has two deployable applications. They share source control and selected packages. They do not share images, runtime configuration, deployment targets, or release jobs.

## Affected-change matrix

| Changed path                                                 | Main catalog                               | Storefront                                       |
| ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------ |
| `apps/main/**`                                               | Run                                        | Skip                                             |
| `apps/storefront/**`                                         | Skip                                       | Run                                              |
| `packages/standalone-runtime/**`                             | Run                                        | Skip                                             |
| `packages/storefront-contract/**`                            | Run                                        | Run                                              |
| Other `packages/**`                                          | Run only if the package graph reaches main | Run only if the package graph reaches storefront |
| `pnpm-lock.yaml`                                             | Run only if the dependency closure changes | Run only if the dependency closure changes       |
| Root package, workspace, Turbo, patch, or Docker ignore file | Run                                        | Run                                              |
| Main-only workflow                                           | Run                                        | Skip                                             |
| Storefront-only workflow                                     | Skip                                       | Run                                              |
| Repository documentation                                     | Skip                                       | Skip                                             |

`.github/scripts/affected-apps.mjs` is the source of truth. It uses `git diff --no-renames` so a file move affects its old path and its new path. It uses Turbo `query affected` for package and lockfile changes. The query compares the dependency closure for each application. A storefront-only package or lockfile change does not select the main application. A shared dependency change selects each affected consumer. A storefront contract change selects the contract test job and both producer and consumer checks. The contract commands use `--fail-if-no-match`; the workflow fails if the package is absent.

Non-runtime app documentation also skips image and deployment jobs. This includes every file under either app's `docs/**` directory and every other app `*.md` file unless it is under that app's `public/**` directory. Public assets and machine-readable documents under `public/**` remain runtime inputs and select their app.

Each workspace package must have a unique name and explicit internal dependencies. The final storefront change must contain the `apps/storefront` lockfile importer and the `@daylily-catalog/storefront` package name. The scope checkout uses the pull-request head commit, not the synthetic merge commit. The classifier fails the job if Git or Turbo cannot make a safe decision.

Pull-request workflows always start the small scope job. This job also runs the path-rule regression tests. App jobs then run or skip. Documentation-only changes keep one visible workflow result without a required check that stays pending.

## Release units

| Boundary           | Main catalog                        | Storefront                              |
| ------------------ | ----------------------------------- | --------------------------------------- |
| Package            | `@daylily-catalog/main`             | `@daylily-catalog/storefront`           |
| Dockerfile         | `apps/main/Dockerfile`              | `apps/storefront/Dockerfile`            |
| Image              | `ghcr.io/makoncline/daylilycatalog` | `ghcr.io/makoncline/daylily-storefront` |
| GitHub environment | `preview` or `production`           | None for the image build                |
| Deploy target      | `daylilycatalog`                    | `rolling-oaks-daylilies` after approval |
| Caddy upstream     | `app:3000`                          | `rolling-oaks-storefront:3000`          |

The main workflow keeps its current deployment behavior, but only main or dependency-affected shared changes can reach it. The storefront workflow verifies the generic image with the approved Rolling Oaks staging identity. It uses remote data and inquiry modes against an ephemeral local HTTPS server that implements the production API contract. It publishes the image after a successful main-branch build. It uses no production credential and does not call a deploy webhook.

Deployment gateway registration, a protected deployment environment, and an automatic webhook need a later owner-controlled cutover.

## Seller and data configuration

`STOREFRONT_SELLER_ID` is required deployment configuration. It is the main catalog `User.id` value. The first Rolling Oaks stack sets `STOREFRONT_SITE_KEY=rolling-oaks`, `STOREFRONT_HOSTNAME=rolling-oaks-daylilies.makon.dev`, and `STOREFRONT_SELLER_ID=3` in its live `.env` file. The generic image is not bound to one seller. It contains the version-controlled approved-site definitions, and the deployment environment selects exactly one definition. The application must not provide a production default.

The storefront has no database credentials and no local catalog snapshot. It reads `GET /api/v1/storefronts/{sellerId}` from `STOREFRONT_API_BASE_URL`. It derives `POST /api/v1/storefronts/{sellerId}/inquiries` from the same base URL. The main service receives `STOREFRONT_INQUIRY_TOKENS_JSON`, which maps approved seller IDs to distinct bearer tokens. Each approved site service receives only its own token as `STOREFRONT_INQUIRY_TOKEN`. Do not reuse one token for multiple sellers. Do not add `STOREFRONT_INQUIRY_URL`. Do not commit a token. The inquiry endpoint must accept the storefront JSON request and return `id` and `acceptedAt`. Do not add a seller build matrix.

The main catalog owns the storefront artifact builder and storage. Provision `/srv/stacks/daylilycatalog/data/storefronts`, which the main container sees as `/data/storefronts`. Build the first artifact from the main embedded replica, and publish files with an atomic rename in that same directory. Run one refresh at a time every 24 hours. The main API must serve only the last complete artifact. `PUBLIC_STOREFRONT_SELLER_IDS` is the explicit main-owned publication allowlist. The initial allowlist contains only `3`. It is separate from each site stack's `STOREFRONT_SELLER_ID`. The artifact job must not discover and publish every seller in the database.

The main stack environment is the only source for `PUBLIC_STOREFRONT_SELLER_IDS`; the systemd unit must not duplicate it. Before a build, the refresh command must resolve every allowlisted seller to one approved site and validate a nonempty API zone/token plus a distinct active zone/token target for every affected site. A missing, duplicated, extra, or inconsistent target must fail before publication.

After the job commits the new manifest, it must purge `daylily-storefront-data` in the API zone with the API token. Only after that succeeds can it purge `daylily-storefront-public-html` in each affected site's own zone with that site's token. A missing target or failed purge must stop later purges, make the run fail, alert, and retry. Storefront health must degrade when the serving artifact is more than 26 hours old. This limit permits two hours of timer jitter and detects a missed daily run before the stale cache windows hide it.

The disabled service and timer examples in `apps/main/deploy/vps` run the source-controlled `apps/main/scripts/refresh-public-storefront-artifacts.mjs` command inside the existing main container. The command validates all site and Cloudflare inputs before it calls the protected loopback refresh route. The route syncs the one embedded replica, publishes the shared-schema-validated artifact atomically, and returns the exact seller set. The command then performs the ordered API and site tag purges. The loopback request has a 15-minute deadline, each purge has a 30-second deadline, and the service has a 30-minute deadline. Focused tests cover missing targets, failed refreshes, and failed purges. Before enablement, connect final service failure to alerting and build the initial seller `3` artifact. The owner must approve the live token and purge inputs, service installation, and timer enablement. This repository change does not enable the production scheduler or call a purge.

## Multi-site server model

Use one generic `ghcr.io/makoncline/daylily-storefront` image. Run one isolated service and container for each approved seller. Each service has its own stack directory, environment file, service name, hostname, Caddy matcher, Cloudflare cache rule, health check, and deployment target. Keep seller IDs only in the version-controlled approved-site definitions and deployment configuration. Do not put them in the Dockerfile, image tag, or workflow matrix. Do not run multiple sellers in one storefront process. Do not add a runtime host registry or a build matrix.

Rolling Oaks is the only initial site:

| Setting                  | Initial value                             |
| ------------------------ | ----------------------------------------- |
| Site key                 | `rolling-oaks`                            |
| Seller ID                | `3`                                       |
| Stack                    | `/srv/stacks/rolling-oaks-daylilies`      |
| Service                  | `rolling-oaks-storefront`                 |
| Initial hostname         | `rolling-oaks-daylilies.makon.dev`        |
| Later canonical hostname | `rollingoaksdaylilies.com` after approval |
| Allowed hostnames        | staging, apex, and `www`                  |

The version-controlled approved-site definition binds the site key `rolling-oaks` and seller ID `3` to `rolling-oaks-daylilies.makon.dev`, `rollingoaksdaylilies.com`, and `www.rollingoaksdaylilies.com`. At startup, one container must verify that `STOREFRONT_SITE_KEY`, `STOREFRONT_HOSTNAME`, and `STOREFRONT_SELLER_ID` select exactly one allowed triple. A missing value or mismatch must stop startup. The first environment selects only `rolling-oaks-daylilies.makon.dev`. Approval in the definition does not activate DNS, Caddy, or the canonical cutover. This prevents one approved seller from appearing under another seller's brand or domain.

To add an approved site:

1. Get owner approval for the site key, main catalog `User.id`, public hostname, brand, and inquiry destination.
2. Add one version-controlled approved-site definition. Bind the site key to the seller ID and all allowed hostnames.
3. Add only that seller ID to the main artifact job allowlist. Build and verify its first atomic artifact before the site starts.
4. Create `/srv/stacks/<site-key>` and a unique `<site-key>-storefront` Compose service. Use the generic image and do not share a container with another seller.
5. Create `/srv/stacks/<site-key>/.env`. Set `IMAGE_TAG`, `STOREFRONT_SITE_KEY`, `STOREFRONT_HOSTNAME`, `STOREFRONT_SELLER_ID`, the remote storefront API values, the inquiry adapter, and that seller's `STOREFRONT_INQUIRY_TOKEN`. Add the matching seller-ID key and distinct token to the main service's `STOREFRONT_INQUIRY_TOKENS_JSON`. Do not give the site another seller's token.
6. Add an explicit Caddy hostname matcher and proxy to the unique service. Set `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-Port` as shown in the Rolling Oaks route.
7. Add an explicit Cloudflare Tunnel and DNS hostname route after separate owner approval. Do not use a wildcard.
8. Add a storefront-hostname Cloudflare cache rule with the exclusions, cache key, status handling, and cache tag in this document.
9. Verify the service health, seller identity, brand, canonical links, inquiry destination, cache `MISS` to `HIT`, positive `Age`, and every cache bypass.
10. Register separate config-sync and deploy targets. Keep automatic deployment disabled until the owner approves the cutover.

## Vercel previews

The main Vercel project must use these settings:

- Root Directory: `apps/main`
- Include source files outside of the Root Directory in the Build Step: enabled
- Skip Unaffected Projects: enabled

Vercel uses the pnpm workspace graph and lockfile to make its native affected decision. `apps/main/vercel.json` also has a source-controlled `ignoreCommand`. It calls the same repository classifier. The command runs from `apps/main`; exit code `0` cancels the build and exit code `1` builds. If the comparison ref is not available in Vercel's clone, the command fails open and builds main.

These controls prevent a storefront-only change from creating a main preview. The main preview alias and E2E workflows keep a second affected-path gate.

For `deployment_status`, the scope jobs run the classifier and fixed Turbo binary from the trusted default-branch checkout. They use the candidate checkout only as Git and package-graph data. The alias comment runs in a later job that does not check out or execute candidate code. Before the E2E job gets preview secrets, the provenance gate requires the deployed SHA to be the exact head of the named branch in `origin`. A fork SHA, missing branch, stale branch head, tag, or raw SHA fails closed and skips E2E. E2E `workflow_dispatch` remains an explicit owner action.

The alias workflow has no manual dispatch. Its trusted default-branch script inspects the canonical deployment URL with Vercel `GET /v13/deployments/{idOrUrl}` before it assigns the alias. The response must match the candidate SHA, `READY` state, `target: null` default Preview target, owner, canonical URL, and main project. Set repository variables `VERCEL_ORG_ID` and `MAIN_VERCEL_PROJECT_ID`, and keep `VERCEL_TOKEN` in the protected `preview` environment. Until all three values exist, preview aliasing stays disabled and fails closed before assignment. A deployment mismatch also fails before assignment. The script uses the returned deployment ID with `POST /v2/deployments/{id}/aliases` and the same organization scope.

Keep the storefront out of this Vercel project. If it later needs Vercel previews, create a separate project and preview domain. The API project check prevents a storefront deployment from receiving a main preview alias.

Current Vercel references:

- [Monorepos and Skip Unaffected Projects](https://vercel.com/docs/monorepos)
- [Project configuration and ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json)
- [Ignored build step behavior](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)
- [Get a deployment by ID or URL](https://vercel.com/docs/rest-api/reference/endpoints/deployments/get-a-deployment-by-id-or-url)
- [Assign an alias](https://vercel.com/docs/rest-api/reference/endpoints/aliases/assign-an-alias)

## Cloudflare page cache

The storefront gets one cache rule for the exact hostname selected by `STOREFRONT_HOSTNAME`. Use a bypass-by-default request expression for anonymous `GET` and `HEAD` requests. The successful origin response must contain both of these headers:

```http
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-public-html
```

Match only the selected hostname. Exclude an `Authorization` header and cookies named `__session` or starting with `__session_`; do not exclude every cookie. Exclude `_rsc`, `RSC: 1`, `Accept: text/x-component`, browser prefetch headers, and `Accept: text/markdown` before cache lookup. Set matching requests to `Eligible for cache`.

Use the explicit origin cache header with `bypass_by_default`. A response without `Cloudflare-CDN-Cache-Control` must bypass cache. Do not add a catch-all edge TTL. Use the default full-URL cache key. Let browser caching respect the origin header. Set `400-599` responses to no-store with `value: -1`. Do not use `0`; that value permits storage and revalidation.

Do not add a route allowlist, API path list, dashboard exclusion list, or blanket cookie bypass to the edge rule. The origin owns the cache policy. Every cacheable response on the storefront hostname, including HTML, public read APIs, machine documents, and the sitemap, uses the explicit header and `daylily-storefront-public-html` tag. The main catalog artifact endpoint uses `daylily-storefront-data` in the separate API zone. Unsafe, private, form, health, and personalized responses must omit the cacheable origin directive or send `no-store`. The edge credential, RSC, prefetch, Markdown, and status guards are defense in depth.

The default full-URL key keeps every filtered API, search, and pagination query separate. It does not vary by `Accept`, so the Markdown bypass must occur before cache lookup.

Before cutover, verify an eligible page through Cloudflare. The first request must be a cache `MISS`. The next request must be a `HIT` with a positive `Age` value. Verify that each excluded route bypasses cache and has no positive `Age` value.

The storefront tag is independent from the main `daylily-public-html` tag. A future successful storefront deployment can purge only `daylily-storefront-public-html`. Purge the storefront hostname once when the tagged policy first becomes available. Do not add the purge to the generic image workflow.

## Cloudflare Tunnel and Caddy

Use one named Cloudflare Tunnel and one internal Caddy service. Use explicit public hostnames and separate Caddy host matchers for the two application services. Cloudflare evaluates ingress rules from top to bottom and requires a final catch-all rule. Each hostname needs a DNS route to the tunnel.

The first storefront target is `rolling-oaks-daylilies.makon.dev`. A later approved cutover can make `rollingoaksdaylilies.com` canonical and redirect its `www` hostname. Do not add `rolling-oaks.daylilycatalog.com` without a separate owner decision.

No DNS, tunnel, Caddy, cache rule, purge token, secret, deployment webhook, enabled scheduler, or production change is part of this repository change.

Current Cloudflare references:

- [Cloudflare CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
- [Cloudflare revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/)
- [Cloudflare cache keys](https://developers.cloudflare.com/cache/how-to/cache-keys/)
- [Tunnel ingress configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Tunnel routing](https://developers.cloudflare.com/tunnel/routing/)
