# Application deployment boundaries

The monorepo has two deployable applications. They share source control and selected packages. They do not share images, runtime configuration, deployment targets, or release jobs.

## Affected-path matrix

| Changed path | Main catalog | Storefront |
| --- | --- | --- |
| `apps/main/**` | Run | Skip |
| `apps/storefront/**` | Skip | Run |
| `packages/standalone-runtime/**` | Run | Skip |
| Other `packages/**` | Run | Run |
| Root package, lock, workspace, Turbo, patch, or Docker ignore file | Run | Run |
| Main-only workflow | Run | Skip |
| Storefront-only workflow | Skip | Run |
| Repository documentation | Skip | Skip |

`.github/scripts/affected-apps.mjs` is the source of truth for this matrix. Pull-request workflows always start the small path-classification job. App jobs then run or skip. This keeps one visible workflow result for documentation-only changes and avoids path-filtered required checks that stay pending.

## Release units

| Boundary | Main catalog | Storefront |
| --- | --- | --- |
| Package | `@daylily-catalog/main` | `@daylily-catalog/storefront` |
| Dockerfile | `apps/main/Dockerfile` | `apps/storefront/Dockerfile` |
| Image | `ghcr.io/makoncline/daylilycatalog` | `ghcr.io/makoncline/daylily-storefront` |
| Preview environment | `preview` | `storefront-preview` |
| Production environment | `production` | `storefront-production` |
| Deploy target | `daylilycatalog` | `rolling-oaks-daylilies` after approval |
| Caddy upstream | `app:3000` | `rolling-oaks-storefront:3000` |

The main workflow keeps its current deployment behavior, but only main or shared changes can reach it. The storefront workflow stops after it publishes a verified image. Deployment gateway registration and automatic deployment need a later owner-controlled cutover.

## Seller configuration

`STOREFRONT_SELLER_ID` is deployment configuration. The first Rolling Oaks stack sets it in its live `.env` file and in its two GitHub environments. The generic image contains no seller identity. Add another stack only after the owner decides to operate another storefront. Do not add a seller build matrix.

## Vercel previews

Keep Vercel connected only to `apps/main` for now. The main preview alias and E2E workflows use affected-path checks, but the GitHub `deployment_status` event does not provide a reliable app identity for two Vercel projects. Connecting a storefront Vercel project could point the main preview alias at the wrong application when one change affects both apps.

The storefront uses its Docker health and Playwright checks. If it later needs Vercel previews, use a separate preview domain and a project-identified event before connection.

## Cloudflare and Caddy

Use one named Cloudflare Tunnel and one internal Caddy service. Use explicit public hostnames and separate Caddy host matchers for the two application services. Cloudflare evaluates ingress rules from top to bottom and requires a final catch-all rule. Each hostname needs a DNS route to the tunnel.

The first storefront target is `rolling-oaks-daylilies.makon.dev`. A later approved cutover can make `rollingoaksdaylilies.com` canonical and redirect its `www` hostname. No DNS, tunnel, Caddy, secret, or production change is part of this repository change.

Current Cloudflare references:

- [Tunnel ingress configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Tunnel routing](https://developers.cloudflare.com/tunnel/routing/)
