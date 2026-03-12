# VPS Deploy Assets

This directory is the committed source of truth for the `daylilycatalog` VPS stack.

Files here belong with the app code because they are app-specific:

- `compose.yaml`: the server stack definition for `/srv/stacks/daylilycatalog`
- `caddy-route.caddy`: the matching Caddy route for the shared proxy stack
- `.env.example`: the runtime env contract for the server stack

Server-wide infrastructure such as the webhook service, Cloudflare Tunnel, Caddy base stack, and deploy runner live in the separate `bootstrap-vps` repo.

## Server layout

On the server, these files end up as:

- `deploy/vps/compose.yaml` -> `/srv/stacks/daylilycatalog/compose.yaml`
- `deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/20-daylilycatalog.caddy`
- `deploy/vps/.env.example` -> documentation only; the live runtime file is `/srv/stacks/daylilycatalog/.env`

## Recommended automation split

Use two jobs:

1. `sync-deploy-config`
   - Trigger on `push` to `main` when `deploy/vps/**` changes.
   - Tell the server to update the committed deploy config for this app.
   - The server should fetch `deploy/vps/` from this repo at the pushed commit SHA, then restart the shared proxy if the route changed.

2. `deploy-image`
   - Trigger after the Docker image push succeeds on `main`.
   - Call the existing deploy webhook with the immutable image tag.
   - Let the server update `IMAGE_TAG`, pull the image, run Compose, smoke-check the app, and send the Telegram notification.

Pull requests can still build images for verification, but they should not update the server automatically.

## Why keep these files in the app repo

The app repo should be the source of truth for:

- which image runs
- which env vars the stack needs
- which volumes it mounts
- which hostname it uses
- which reverse proxy route it expects

The server should keep only runtime state and secrets:

- `/srv/stacks/daylilycatalog/.env`
- `next-cache`
- the currently deployed `IMAGE_TAG`

## Current deploy webhook

The existing image deploy webhook contract is:

```http
POST https://deploy.makon.dev/deploy/daylilycatalog
Authorization: Bearer <DEPLOY_WEBHOOK_TOKEN>
Content-Type: application/json

{"image_tag":"main-15f26026","clear_cache":false}
```

The webhook itself lives in the server bootstrap repo, not here.
