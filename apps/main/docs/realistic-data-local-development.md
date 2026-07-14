# Realistic-data local development

This process creates a local-only database from the latest production SQLite snapshot, preserves representative catalog content (including private notes), and replaces production Clerk and Stripe bindings with stage/test identities. It never modifies the source snapshot or deterministic integration seeds.

This is separate from [`prod-like-local-docker-smoke.md`](./prod-like-local-docker-smoke.md), which runs the production Docker image locally.

From `apps/main`:

```sh
pnpm realistic-data:prepare
pnpm realistic-data:dev
```

The app runs at <http://localhost:3012>. Snapshot generation refuses production Clerk or Stripe keys, clears production identity bindings, preserves public catalog visibility with synthetic local subscription IDs, and maps only the configured personas to stage Clerk and Stripe test mode.

| Catalog           | Email                                         | Code     |
| ----------------- | --------------------------------------------- | -------- |
| Rolling Oaks      | `prodlike+clerk_test_rollingoaks@example.com` | `424242` |
| PlantFancyGardens | `prodlike+clerk_test_plantfancy@example.com`  | `424242` |

Edit `scripts/realistic-data-personas.mjs` and regenerate the snapshot to add a persona. See [`agent-development-flywheel.md`](./agent-development-flywheel.md) for browser, screenshot, and verification workflows.
