# Daylily Catalog

Daylily Catalog is a catalog, storefront, and seller dashboard for daylily
growers. It serves public grower catalogs and cultivar pages while giving
sellers tools for listings, images, lists, subscriptions, and catalog content.

## Project Layout

The main application lives in `apps/main` as the `@daylily-catalog/main`
workspace package. The root package mostly provides pnpm and Turbo commands for
running that app.

## Stack

- Next.js App Router and React
- Prisma with SQLite locally and Turso/libSQL in hosted environments
- tRPC for app APIs
- Clerk for authentication
- Stripe for subscriptions and checkout
- TanStack DB for dashboard client data
- Vitest and Playwright for automated tests
- Sentry and PostHog for observability

## Quick Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies and generate Prisma client output. |
| `pnpm dev` | Start the main app in development mode. |
| `pnpm lint` | Run the app lint gate. |
| `pnpm typecheck` | Run TypeScript checking. |
| `pnpm test` | Run Vitest tests. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |

Use `pnpm main <script>` to run an app script directly, for example
`pnpm main test -- tests/public-profile-route.test.ts`.

## Key Docs

- `apps/main/README.md` - app-specific map and development notes.
- `apps/main/docs/e2e-tests.md` - Playwright workflow and conventions.
- `apps/main/docs/deploy-vps.md` - VPS Docker deployment runbook.
- `apps/main/docs/public-rendering-cache-strategy.md` - public page rendering
  and cache strategy.
- `apps/main/docs/local-query-profiler.md` - local query profiling workflow.
- `apps/main/docs/README.md` - index of app runbooks and product notes.
- `AGENTS.md` - coding-agent conventions, repo gotchas, and command notes.
