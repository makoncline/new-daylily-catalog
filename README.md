# Daylily Catalog

Daylily Catalog is a catalog, storefront, and seller dashboard for daylily
growers. It serves public grower catalogs and cultivar pages while giving
sellers tools for listings, images, lists, subscriptions, and catalog content.

The project is production software, not a starter template. This public
repository is primarily useful as a source view of the product architecture and
implementation choices rather than as a turnkey local setup guide.

## Product Scope

- Public grower catalogs with searchable listings and cultivar details.
- Seller dashboard workflows for listings, images, lists, tags, and storefront
  content.
- Subscription and checkout flows for paid catalog features.
- Read-only MCP tools for querying public catalog data and authenticated seller
  inventory.
- Search and cultivar-reference workflows for daylily-specific data.

## Repository Shape

The main application lives in `apps/main` as the `@daylily-catalog/main`
workspace package. The root package is mostly workspace orchestration for that
app.

## Stack

- Next.js App Router and React
- Prisma with SQLite locally and Turso/libSQL in hosted environments
- tRPC for app APIs
- Clerk for authentication
- Stripe for subscriptions and checkout
- TanStack DB for dashboard client data
- Vitest and Playwright for automated tests
- Sentry and PostHog for observability

## Internal Documentation

- `apps/main/README.md` - app-specific map and development notes.
- `apps/main/docs/README.md` - index of app runbooks and product notes.
- `apps/main/docs/deploy-vps.md` - VPS Docker deployment runbook.
- `apps/main/docs/public-rendering-cache-strategy.md` - public page rendering
  and cache strategy.
- `apps/main/docs/local-query-profiler.md` - local query profiling workflow.
- `AGENTS.md` - coding-agent conventions, repo gotchas, and command notes.

Local operation depends on private environment configuration. When running
repo scripts in an existing configured checkout, prefer the documented
runbooks and the `env:dev` wrapper where environment loading matters.
