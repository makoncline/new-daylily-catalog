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

The main workflow keeps its current deployment behavior, but only main or dependency-affected shared changes can reach it. The storefront workflow uses fixture data and a stub inquiry adapter to verify the generic image. It publishes the image after a successful main-branch build. It does not use seller configuration and does not call a deploy webhook.

Deployment gateway registration, a protected deployment environment, and an automatic webhook need a later owner-controlled cutover.

## Seller and data configuration

`STOREFRONT_SELLER_ID` is required deployment configuration. It is the main catalog `User.id` value. The first Rolling Oaks stack sets `STOREFRONT_SITE_KEY=rolling-oaks`, `STOREFRONT_HOSTNAME=rolling-oaks-daylilies.makon.dev`, and `STOREFRONT_SELLER_ID=3` in its live `.env` file. The generic image is not bound to one seller. It contains the version-controlled approved-site definitions, and the deployment environment selects exactly one definition. The application must not provide a production default.

The storefront has no database credentials and no local catalog snapshot. It reads `GET /api/v1/storefronts/{sellerId}` from `STOREFRONT_API_BASE_URL`. It derives `POST /api/v1/storefronts/{sellerId}/inquiries` from the same base URL. The main service receives `STOREFRONT_INQUIRY_TOKENS_JSON`, which maps approved seller IDs to distinct bearer tokens. Each approved site service receives only its own token as `STOREFRONT_INQUIRY_TOKEN`. Do not reuse one token for multiple sellers. Do not add `STOREFRONT_INQUIRY_URL`. Do not commit a token. The inquiry endpoint must accept the storefront JSON request and return `id` and `acceptedAt`. Do not add a seller build matrix.

The main catalog owns the storefront artifact builder and storage. Provision `/srv/stacks/daylilycatalog/data/storefront-artifacts`, build the first artifact from the main embedded replica, and publish files with an atomic rename in that same directory. Run one refresh at a time every 24 hours. The main API must serve only the last complete artifact. `PUBLIC_STOREFRONT_SELLER_IDS` is the explicit main-owned publication allowlist. The initial allowlist contains only `3`. It is separate from each site stack's `STOREFRONT_SELLER_ID`. The artifact job must not discover and publish every seller in the database.

After the job commits the new manifest, it must purge `daylily-storefront-data`. It must then purge the affected `daylily-storefront-public-html` tags. A purge failure must make the run fail, alert, and retry. Storefront health must degrade when the serving artifact is more than 26 hours old. This limit permits two hours of timer jitter and detects a missed daily run before the stale cache windows hide it.

The disabled service and timer examples in `apps/main/deploy/vps` define the integration point. The final artifact command does not exist on this branch. Do not invent or install a replacement. Before enablement, the implementation must add a source-controlled one-shot command, an exclusive lock, atomic publication, ordered purge tests, retry behavior, alerting, and the initial seller `3` artifact. The owner must approve the final command, live purge inputs, service installation, and timer enablement. This repository change does not enable the production scheduler or call a purge.

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

The version-controlled approved-site definition binds the site key, seller ID, and allowed hostnames. At startup, the service must verify that `STOREFRONT_SITE_KEY`, `STOREFRONT_HOSTNAME`, and `STOREFRONT_SELLER_ID` match one approved definition. A missing value or mismatch must stop startup. The initial Rolling Oaks allowed-host set contains only `rolling-oaks-daylilies.makon.dev`. Add `rollingoaksdaylilies.com` to the definition and configure its `www` redirect only in the separately approved canonical cutover. This prevents one approved seller from appearing under another seller's brand or domain.

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

For `deployment_status`, the scope jobs run the classifier and fixed Turbo binary from the trusted default-branch checkout. They use the candidate checkout only as Git and package-graph data. The alias comment runs in a later job that does not check out or execute candidate code. Before the E2E job gets preview secrets, the provenance gate requires the deployed SHA to be the exact head of the named branch in `origin`. A fork SHA, missing branch, stale branch head, tag, or raw SHA fails closed and skips E2E. `workflow_dispatch` remains an explicit owner action.

Keep Vercel connected only to `apps/main` for now. A generic `deployment_status` event does not give the existing workflows a reliable Vercel project identity. If the storefront later needs Vercel previews, create a separate project and preview domain. Add a project-identity gate before connection.

Current Vercel references:

- [Monorepos and Skip Unaffected Projects](https://vercel.com/docs/monorepos)
- [Project configuration and ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json)
- [Ignored build step behavior](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)

## Cloudflare page cache

The storefront gets its own hostname cache rule. Use a bypass-by-default request expression. Allow only anonymous public `GET` and `HEAD` document routes, and set those routes to `Eligible for cache`. The successful origin response must contain both of these headers:

```http
Cloudflare-CDN-Cache-Control: public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-public-html
```

Let the explicit origin header set the edge TTL. Do not add a catch-all edge TTL. Use the default full-URL cache key. Let browser caching respect the origin header. Set `400-599` responses to no-store with `value: -1`. Do not use `0`; that value permits storage and revalidation.

The rule expression must bypass excluded requests even if Next sets an ordinary cacheable `Cache-Control` header. Do not use header omission as the only bypass control.

Make only these API routes eligible for anonymous `GET` and `HEAD` caching: `/api/catalogs`, `/api/catalog/*`, and `/api/listings/*`. Store a response only when the origin sends an explicit `Cloudflare-CDN-Cache-Control` header. These API responses must use `Cache-Tag: daylily-storefront-data`. Keep the default full-URL key so filters, searches, and pagination remain separate.

Apply the same explicit-header rule to these exact machine routes: `/sitemap.xml`, `/robots.txt`, `/openapi.json`, `/llms.txt`, `/.well-known/api-catalog`, `/.well-known/agent-skills/index.json`, `/.well-known/agent-skills/availability-inquiry/SKILL.md`, `/.well-known/agent-skills/catalog-navigation/SKILL.md`, `/.well-known/agent-skills/cultivar-reference/SKILL.md`, and `/.well-known/agent-skills/site-navigation/SKILL.md`. These responses must use `Cache-Tag: daylily-storefront-public-html`.

Always bypass `/cart`, `/contact`, `/thanks`, `/api/forms`, `/api/health`, mutations, requests with cookies or authorization credentials, errors, personalized responses, RSC, prefetch, and `Accept: text/markdown`. Do not cache other `/api/` routes. Do not cache methods other than `GET` and `HEAD`. The default cache key does not vary by `Accept`, so the Markdown bypass must occur before cache lookup.

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
