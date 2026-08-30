# Application deployment boundaries

The monorepo has two deployable applications. They share source control and selected packages. They do not share images, runtime configuration, deployment targets, or release jobs.

## Affected-change matrix

| Changed path | Main catalog | Storefront |
| --- | --- | --- |
| `apps/main/**` | Run | Skip |
| `apps/storefront/**` | Skip | Run |
| `packages/standalone-runtime/**` | Run | Skip |
| Other `packages/**` | Run only if the package graph reaches main | Run only if the package graph reaches storefront |
| `pnpm-lock.yaml` | Run only if the dependency closure changes | Run only if the dependency closure changes |
| Root package, workspace, Turbo, patch, or Docker ignore file | Run | Run |
| Main-only workflow | Run | Skip |
| Storefront-only workflow | Skip | Run |
| Repository documentation | Skip | Skip |

`.github/scripts/affected-apps.mjs` is the source of truth. It uses `git diff --no-renames` so a file move affects its old path and its new path. It uses Turbo `query affected` for package and lockfile changes. The query compares the dependency closure for each application. A storefront-only package or lockfile change does not select the main application. A shared dependency change selects each affected consumer.

Each workspace package must have a unique name and explicit internal dependencies. The final storefront change must contain the `apps/storefront` lockfile importer and the `@daylily-catalog/storefront` package name. The scope checkout uses the pull-request head commit, not the synthetic merge commit. The classifier fails the job if Git or Turbo cannot make a safe decision.

Pull-request workflows always start the small scope job. This job also runs the path-rule regression tests. App jobs then run or skip. Documentation-only changes keep one visible workflow result without a required check that stays pending.

## Release units

| Boundary | Main catalog | Storefront |
| --- | --- | --- |
| Package | `@daylily-catalog/main` | `@daylily-catalog/storefront` |
| Dockerfile | `apps/main/Dockerfile` | `apps/storefront/Dockerfile` |
| Image | `ghcr.io/makoncline/daylilycatalog` | `ghcr.io/makoncline/daylily-storefront` |
| GitHub environment | `preview` or `production` | None for the image build |
| Deploy target | `daylilycatalog` | `rolling-oaks-daylilies` after approval |
| Caddy upstream | `app:3000` | `rolling-oaks-storefront:3000` |

The main workflow keeps its current deployment behavior, but only main or dependency-affected shared changes can reach it. The storefront workflow uses fixture data and a stub inquiry adapter to verify the generic image. It publishes the image after a successful main-branch build. It does not use seller configuration and does not call a deploy webhook.

Deployment gateway registration, a protected deployment environment, and an automatic webhook need a later owner-controlled cutover.

## Seller and data configuration

`STOREFRONT_SELLER_ID` is required deployment configuration. It is the main catalog `User.id` value. The first Rolling Oaks stack sets it only in its live `.env` file. The generic image and workflow contain no seller identity. The application must not provide a production default.

The storefront has no database credentials and no local catalog snapshot. It reads `GET /api/v1/storefronts/{sellerId}` from `STOREFRONT_API_BASE_URL`. It sends inquiries through the configured HTTP inquiry adapter. That endpoint must accept the storefront JSON request and return `id` and `acceptedAt`. Do not add a seller build matrix.

The main catalog owns the storefront artifact builder and storage. Provision `/srv/stacks/daylilycatalog/data/storefront-artifacts`, build the first artifact from the main embedded replica, and publish files with an atomic rename in that same directory. Run one refresh at a time every 24 hours. The main API must serve only the last complete artifact. The initial build, serial schedule, failure monitoring, and recovery test are deployment prerequisites. This change does not add or enable the production scheduler.

## Vercel previews

The main Vercel project must use these settings:

- Root Directory: `apps/main`
- Include source files outside of the Root Directory in the Build Step: enabled
- Skip Unaffected Projects: enabled

Vercel uses the pnpm workspace graph and lockfile to make its native affected decision. `apps/main/vercel.json` also has a source-controlled `ignoreCommand`. It calls the same repository classifier. The command runs from `apps/main`; exit code `0` cancels the build and exit code `1` builds. If the comparison ref is not available in Vercel's clone, the command fails open and builds main.

These controls prevent a storefront-only change from creating a main preview. The main preview alias and E2E workflows keep a second affected-path gate.

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

Do not cache `/cart`, `/contact`, `/thanks`, `/api/**`, form, inquiry, health, error, authenticated, personalized, RSC, prefetch, or `Accept: text/markdown` responses. Do not cache methods other than `GET` and `HEAD`. The default cache key does not vary by `Accept`, so the Markdown bypass must occur before cache lookup. Upstream API or artifact caching is separate from public HTML page caching.

Before cutover, verify an eligible page through Cloudflare. The first request must be a cache `MISS`. The next request must be a `HIT` with a positive `Age` value. Verify that each excluded route bypasses cache and has no positive `Age` value.

The storefront tag is independent from the main `daylily-public-html` tag. A future successful storefront deployment can purge only `daylily-storefront-public-html`. Purge the storefront hostname once when the tagged policy first becomes available. Do not add the purge to the generic image workflow.

## Cloudflare Tunnel and Caddy

Use one named Cloudflare Tunnel and one internal Caddy service. Use explicit public hostnames and separate Caddy host matchers for the two application services. Cloudflare evaluates ingress rules from top to bottom and requires a final catch-all rule. Each hostname needs a DNS route to the tunnel.

The first storefront target is `rolling-oaks-daylilies.makon.dev`. A later approved cutover can make `rollingoaksdaylilies.com` canonical and redirect its `www` hostname. Do not add `rolling-oaks.daylilycatalog.com` without a separate owner decision.

No DNS, tunnel, Caddy, cache rule, purge token, secret, deployment webhook, scheduler, or production change is part of this repository change.

Current Cloudflare references:

- [Cloudflare CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
- [Cloudflare revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/)
- [Cloudflare cache keys](https://developers.cloudflare.com/cache/how-to/cache-keys/)
- [Tunnel ingress configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Tunnel routing](https://developers.cloudflare.com/tunnel/routing/)
