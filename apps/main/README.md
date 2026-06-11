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

## Development Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm main dev` | Start the app with `scripts/with-env.mjs` and Next dev. |
| `pnpm main lint` | Run ESLint over `src`. |
| `pnpm main typecheck` | Run `tsc --noEmit`. |
| `pnpm main test` | Run the Vitest suite. |
| `pnpm main test -- tests/<file>.test.ts` | Run one Vitest file. |
| `pnpm main test:e2e` | Run the Playwright suite. |
| `pnpm main profile:queries` | Run the strategic local query profiler. |

The root scripts (`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
`pnpm test:e2e`) delegate to this package through Turbo.

## Environment Loading

Development commands use `scripts/with-env.mjs`. For `--env development`, it
loads `.env.development` from the repository root first and then
`apps/main/.env.development` if that file exists. Keep local secrets in ignored
env files and update `.env.example` when adding or renaming required variables.

## Testing Notes

- Unit and integration tests use Vitest: `pnpm main test`.
- A focused Vitest file can be run with
  `pnpm main test -- tests/<file>.test.ts`.
- Browser tests use Playwright: `pnpm main test:e2e`.
- Local Playwright runs create a temp SQLite database when `BASE_URL` is not
  set. Attach/preview runs use `BASE_URL` and should not seed data.

## Related Docs

- `docs/README.md` - categorized index for app runbooks.
- `docs/e2e-tests.md` - Playwright workflow and tagging rules.
- `docs/deploy-vps.md` - VPS Docker deployment and runtime contract.
- `docs/public-rendering-cache-strategy.md` - public page cache strategy.
- `docs/local-query-profiler.md` - local query profiling workflow.
- `docs/prod-readonly-dashboard-smoke.md` - production-shaped read-only smoke
  testing from local code.
- `../../AGENTS.md` - agent-oriented repo conventions and gotchas.
