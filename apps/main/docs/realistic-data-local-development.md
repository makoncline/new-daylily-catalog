# Seeded local development

This process creates a local-only database from the latest production SQLite snapshot, preserves representative catalog content (including private notes), and replaces production Clerk and Stripe bindings with stage/test identities. It never modifies the source snapshot or deterministic integration seeds.

This is the stage/test proof path. It is separate from
[`prod-like-local-docker-smoke.md`](./prod-like-local-docker-smoke.md), which
runs the actual production Docker image and production service configuration
locally. The `prodlike+` personas below apply only to this seeded development
path.

From the repository root:

```sh
pnpm db:seed:prepare
pnpm dev
```

The app runs at <http://localhost:3000>. `pnpm dev` uses the generated seeded
database by default. Set `DATABASE_URL` explicitly to use a different database.
Preparation also builds the matching local cultivar search index. Snapshot
generation refuses production Clerk or Stripe keys, clears production
identity bindings and inquiry rate limits, preserves public catalog visibility
with synthetic local subscription IDs, and maps only the configured personas
to stage Clerk and Stripe test mode.

| Catalog           | Email                                         | Code     |
| ----------------- | --------------------------------------------- | -------- |
| Rolling Oaks      | `prodlike+clerk_test_rollingoaks@example.com` | `424242` |
| PlantFancyGardens | `prodlike+clerk_test_plantfancy@example.com`  | `424242` |

Edit `scripts/realistic-data-personas.mjs` and regenerate the snapshot to add a persona.
