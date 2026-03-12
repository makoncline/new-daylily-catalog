# VPS Deploy Assets

- `compose.yaml`: stack file for `/srv/stacks/daylilycatalog`
- `caddy-route.caddy`: Caddy route for `daylilycatalog.com`, `www.daylilycatalog.com`, and `prod.daylilycatalog.com`
- `.env.example`: runtime env contract for the stack

These files are the deploy source of truth. Copy them directly to the server stack paths below.

Server paths:

- `deploy/vps/compose.yaml` -> `/srv/stacks/daylilycatalog/compose.yaml`
- `deploy/vps/caddy-route.caddy` -> `/srv/stacks/proxy/sites/20-daylilycatalog.caddy`
- `deploy/vps/.env.example` -> reference only; live runtime env stays in `/srv/stacks/daylilycatalog/.env`

Deploy webhook:

```http
POST https://deploy.makon.dev/deploy/daylilycatalog
Authorization: Bearer <DEPLOY_WEBHOOK_TOKEN>
Content-Type: application/json

{"image_tag":"main-15f26026","clear_cache":false}
```
