# @daylily-catalog/main

This package is the all-in-one Daylily Catalog Next.js app. It owns the public
catalog pages, seller dashboard, onboarding flows, payments, API routes, MCP
read-only tools, search, and operational scripts for the main product.

## Directory Map

- `src/app/` - Next.js App Router routes, layouts, route handlers, and
  route-local components.
- `src/components/` - shared UI and feature components. `src/components/ui/`
  contains shadcn components.
- `src/server/` - tRPC routers, database clients, Clerk integration, Stripe,
  MCP tools, search, analytics, and server-side services.
- `prisma/` - Prisma schema, migrations, and reviewed data-migration SQL.
- `tests/` - Vitest integration/unit specs and Playwright end-to-end specs.

## Operational Context

This app expects environment-specific configuration for database access,
authentication, payments, storage, observability, and production-like smoke
tests. Do not treat this README as a complete local setup guide.

For configured checkouts, scripts that need local environment values should run
through the existing environment wrapper. At the root, `pnpm env:dev ...`
delegates to this package's `scripts/with-env.mjs --env development -- ...`;
inside `apps/main`, the equivalent is `pnpm env:dev ...`.

Routine verification and operational workflows are documented in the runbooks
linked below and in `../../AGENTS.md`.

## Environment Loading

`scripts/with-env.mjs` loads the requested `.env.<name>` file from the
repository root first and then `apps/main/.env.<name>` if that file exists.
Keep local secrets in ignored env files and update `.env.example` when adding
or renaming required variables.

## Testing And Runbooks

The repo has focused Vitest coverage for app-owned behavior and Playwright
coverage for browser flows. Local Playwright runs can create temporary SQLite
databases; attach/preview runs use `BASE_URL` and should not seed data. See the
linked docs for the current workflow details instead of copying commands from
memory.

## Related Docs

- `docs/README.md` - categorized index for app runbooks.
- `docs/e2e-tests.md` - Playwright workflow and tagging rules.
- `docs/deploy-vps.md` - VPS Docker deployment and runtime contract.
- `docs/public-rendering-cache-strategy.md` - public page cache strategy.
- `docs/local-query-profiler.md` - local query profiling workflow.
- `docs/prod-readonly-dashboard-smoke.md` - production-shaped read-only smoke
  testing from local code.
- `../../AGENTS.md` - agent-oriented repo conventions and gotchas.
