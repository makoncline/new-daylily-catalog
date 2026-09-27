# Daylily Catalog App Docs

This directory holds focused runbooks and product notes for `apps/main`. Keep
deep operational detail in the linked documents and use this index for routing.

## Start Here

- [`../README.md`](../README.md) - app source map and environment loading.
- [`implementation-patterns.md`](implementation-patterns.md) - current route,
  UI, server, and data patterns.
- [`agent-development-flywheel.md`](agent-development-flywheel.md) - choose a
  browser, Atlas, or full-app integration loop for the change.
- [Root agent guide](../../../AGENTS.md) - work rules and commands.

From the repository root, `pnpm verify` runs lint, typecheck, and Vitest.
`pnpm verify --full` adds offline full-app integration. Run
`pnpm verify --flow <flow-id>` for the flow's listed commands. Some flows need
connected stage services.

## Local Development and Tests

- `realistic-data-local-development.md` - generate and use the production-shaped
  seeded development database.
- `agent-development-flywheel.md` - Atlas visual flows and the offline full-app
  integration harness with disposable data and local providers.
- `e2e-tests.md` - Playwright local, preview, and page-object workflow.
- `prod-like-local-docker-smoke.md` - local production container with a database
  copy and production service configuration.
- `local-query-profiler.md` - local profiling against a production-shaped
  SQLite snapshot.
- `query-performance-notes.md` - query profiling findings and follow-up notes.
- `shadcn-upgrades.md` - local shadcn component upgrade notes.

## Deployment and Production

- `deploy-vps.md` - VPS Docker deployment, runtime env, and host strategy.
- `feature-flags.md` - server and frontend runtime feature-flag workflow.
- `observability-product-research.md` - Sentry, PostHog, Search Console,
  Ahrefs, and VPS log workflows for product research and production triage.
- `prod-readonly-dashboard-smoke.md` - read-only production-shaped dashboard
  smoke workflow.
- `db-backup-readme.md` - database backup workflow.
- `public-rendering-cache-strategy.md` - public rendering and cache ownership.
- `public-cloudflare-html-cache.md` - Cloudflare-owned public HTML cache
  rollout and verification plan.
- `next-16-cache-migration-notes.md` - older cache migration notes retained for
  context.

## Data, Search, and Cultivar Migration

- `public-cultivar-search-research.md` - competitive research, search/SEO
  strategy, and phased implementation recommendations for a public cultivar
  search over the full registry.
- `db-migration.md` - database migration workflow.
- `cultivar-reference-migration.md` - cultivar reference migration notes.
- `cultivar-reference-dedupe-runbook.md` - cultivar reference dedupe runbook.
- `v2-ahs-cultivar-migration.md` - V2 AHS cultivar migration notes.
- `ahs-v2-migration-todo.json` - machine-readable V2 migration todo list.
- `api-endpoints.md` - API endpoint reference.
- `parentage-tree-api-example.md` - parentage API example.

## Product and Features

- `features.md` - product feature notes.
- `user-stories.md` - user-story notes.
- `landing-page.md` - landing page notes.
- `onboarding-capture-review-2026-02-27.md` - onboarding capture review.
- `todo.md` - app-level todo notes.
