# Agents

This repository contains the Daylily Catalog Next.js app. Use the tracked
scripts and installed package documentation as the source of truth.

- Use ASD-STE100 style. Write short, direct sentences.
- Make the smallest complete change. Remove obsolete paths and avoid temporary architecture.
- Keep route, UI, server, and data concerns separate. Check existing patterns, dependencies, and installed types before adding code.
- Add a few meaningful tests for changed behavior. Prefer integration tests. Do not test facts that TypeScript guarantees. Check the user-visible result when a flow changes.
- Do not run `codex review` unless the user asks for it.
- Use clear code and tests as examples. Keep per-change reports, plans, and screenshots out of Git. Add only essential operating docs that code and tests cannot explain.
- If you learn a reusable, non-obvious detail, append it to `logs.md` in this format: `[YYYY-MM-DD] Short label: What was learned. When it matters. What future agents should do.`

When choosing or prioritizing work, read [GOALS.md](GOALS.md). When a prior
technical lesson may affect the change, check [logs.md](logs.md).

Run scripts from the repository root with `pnpm`. Development env values come
from varlock: `apps/main/.env.schema` declares every variable,
`apps/main/.env.development` holds non-secret values, and secrets come from the
1Password Environment "Daylily — Development". A read-only service account
token in `DAYLILY_OP_SERVICE_ACCOUNT_TOKEN` signs in. On the Mac, `~/.zshenv`
reads it from the login Keychain; without it, the 1Password desktop app asks
for approval for each new shell. `pnpm dev`, `pnpm test:e2e`, and the seed
commands load these values. Use `pnpm env:dev <command>` for other scripts. Put machine-only overrides in the
ignored `apps/main/.env.development.local`. Do not reuse another checkout's
server, database, or port. Connected E2E CI loads development values with
`pnpm main env:dev` and the repository secret `DAYLILY_OP_SERVICE_ACCOUNT_TOKEN`.
The PR CI aggregate status is `Verify PR`.

Codex Cloud settings are in the ChatGPT web UI. Set
`DAYLILY_OP_SERVICE_ACCOUNT_TOKEN` as an environment variable. Codex removes
secrets before the agent phase. Use the setup script
`pnpm install --frozen-lockfile && pnpm main exec playwright install --with-deps chromium && pnpm db:seed:pull`.
For agent internet access, allow the Common dependencies domains plus
`1password.com`, `*.1password.com`, `*.r2.cloudflarestorage.com`, `clerk.com`,
`api.clerk.com`, `*.clerk.accounts.dev`, and `api.stripe.com`.

Use the [Atlas flow registry](apps/main/scripts/atlas-flows.mjs) to find
completed dashboard examples, implementation entry points, behavior rules,
and test runners. Update the flow entry when its source or tests change.
Keep this registry as the only flow map.

- `pnpm verify` runs lint, typecheck, and all Vitest tests.
- `pnpm typecheck` generates current Next route types, then checks the app and
  tests with `apps/main/tsconfig.typecheck.json`. It needs no app-service
  credentials or dev server. This config excludes `.next/dev` so old dev
  validators cannot fail the check. Keep `tsconfig.json` for Next dev/build.
- `pnpm verify --tests tests/<file>` runs lint, typecheck, and selected Vitest files. Paths are relative to `apps/main`.
- `pnpm verify --flow <Atlas ID>` runs only the mapped tests. Run lint and typecheck separately.
- `pnpm verify --full` adds all full-app Playwright integration tests to the default checks. The runner uses a disposable local database and loopback service providers.

Flow commands can include connected Playwright E2E tests. These need development
service configuration, including Clerk test credentials; they are separate from
the full-app integration runner. Install Playwright Chromium for browser tests.
Use free `INTEGRATION_PORT` and `E2E_PORT` values for local runs.

Local app work uses the realistic seed in the private R2 bucket
`daylily-catalog-dev`. On first start, `pnpm dev` downloads it. After a schema
change, `pnpm dev` updates the local copy and keeps local edits across
restarts. `pnpm db:seed:pull` replaces the local copy with the published seed.
After schema changes, or for fresh data, run `pnpm db:seed:publish` on the Mac.
It needs the local production copy. The seed has fake private notes, non-Pro profiles, and contact details. For throwaway edits, use
`pnpm dev -- --disposable --port <free-port> --hostname localhost`. It copies
the full seed and removes its copy on shutdown. After restart, use dashboard
Refresh or a fresh browser context. An explicit `DATABASE_URL` stays
caller-owned and cannot use `--disposable`. The seed is production-derived.
Keep it out of Git and public evidence.

Use [database migration steps](apps/main/docs/db-migration.md) for schema and
data changes, [V2 AHS refresh](.codex/skills/v2-ahs-refresh/SKILL.md) for
cultivar updates, and [image catch-up](apps/main/docs/generated-cultivar-image-catchup.md)
for generated cultivar images. Use [VPS deployment](apps/main/docs/deploy-vps.md)
and [production container smoke](apps/main/docs/prod-like-local-docker-smoke.md)
for deployment work.

Keep server-only modules out of client imports. Read installed Next docs in
`apps/main/node_modules/next/dist/docs/` before changing framework behavior.
Add new env names to `apps/main/.env.schema`, and to `apps/main/.env.example`
when production needs them. Use `NEXT_PUBLIC_` only
when the browser needs a value.
