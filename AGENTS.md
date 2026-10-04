# Agents

This repository contains the Daylily Catalog Next.js app. Use the tracked
scripts and installed package documentation as the source of truth.

- Use ASD-STE100 style. Write short, direct sentences.
- Make the smallest complete change. Remove obsolete paths and avoid temporary architecture.
- Keep route, UI, server, and data concerns separate. Check existing patterns, dependencies, and installed types before adding code.
- Add a few meaningful tests for changed behavior. Prefer integration tests. Do not test facts that TypeScript guarantees. Check the user-visible result when a flow changes.
- Do not run `codex review` unless the user asks for it.
- If you learn a reusable, non-obvious detail, append it to `logs.md` in this format: `[YYYY-MM-DD] Short label: What was learned. When it matters. What future agents should do.`

When choosing or prioritizing work, read [GOALS.md](GOALS.md). When a prior
technical lesson may affect the change, check [logs.md](logs.md).

Run scripts from the repository root with `pnpm`. Use `pnpm env:dev <command>`
when a script needs development env values. Keep credentials in ignored env
files. Do not reuse another checkout's server, database, or port. The PR CI
aggregate status is `Verify PR`.

Use the [Atlas flow registry](apps/main/scripts/atlas-flows.mjs) to find
completed dashboard examples, implementation entry points, behavior rules,
and test runners. Update the flow entry when its source or tests change.
Keep this registry as the only flow map.

- `pnpm verify` runs lint, typecheck, and all Vitest tests.
- `pnpm verify --tests tests/<file>` runs lint, typecheck, and selected Vitest files. Paths are relative to `apps/main`.
- `pnpm verify --flow <Atlas ID>` runs only the mapped tests. Run lint and typecheck separately.
- `pnpm verify --full` adds all full-app Playwright integration tests to the default checks. The runner uses a disposable local database and loopback service providers.

Flow commands can include connected Playwright E2E tests. These need development
service configuration, including Clerk test credentials; they are separate from
the full-app integration runner. Install Playwright Chromium for browser tests.
Use free `INTEGRATION_PORT` and `E2E_PORT` values for local runs.

Use [database migration steps](apps/main/docs/db-migration.md) for schema and
data changes, [V2 AHS refresh](.codex/skills/v2-ahs-refresh/SKILL.md) for
cultivar updates, and [image catch-up](apps/main/docs/generated-cultivar-image-catchup.md)
for generated cultivar images. Use [VPS deployment](apps/main/docs/deploy-vps.md)
and [production container smoke](apps/main/docs/prod-like-local-docker-smoke.md)
for deployment work.

Keep server-only modules out of client imports. Read installed Next docs in
`apps/main/node_modules/next/dist/docs/` before changing framework behavior.
Add required env names to `apps/main/.env.example`. Use `NEXT_PUBLIC_` only
when the browser needs a value.
