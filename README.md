# Daylily Catalog

Daylily Catalog provides public grower catalogs, cultivar pages, and seller tools for listings, images, subscriptions, and catalog content. The Next.js app is in `apps/main`.

See [GOALS.md](GOALS.md) for project direction, [AGENTS.md](AGENTS.md) for work
rules, and the [VPS runbook](apps/main/docs/deploy-vps.md) for deployment.

Full browser verification needs Playwright Chromium and a real `sqld` server.
Install `sqld` from the [libSQL 0.24.32 release](https://github.com/tursodatabase/libsql/releases/tag/libsql-server-v0.24.32).
Put the binary on `PATH`, or set `SQLD_BINARY` to its absolute path.
`pnpm verify --full` and the mapped listing flow use this resolver for the
isolated database transport test. The test uses four consecutive loopback
ports from `INTEGRATION_PORT` (default `3210`). Choose free ports for local runs.
