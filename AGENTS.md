# Agents

This repository contains the Daylily Catalog Next.js app. Start here, then open
the guide for the area you will change. Read [historical notes](logs.md) only
when a note relates to the current task. Check older notes against current code.

## Work rules

- Use ASD-STE100 style. Write short, direct sentences.
- Make the smallest complete change. Remove obsolete paths instead of adding
  compatibility layers or temporary architecture.
- Keep route, UI, server, and data concerns separate. Follow an existing
  pattern before you add an abstraction or dependency.
- Use the libraries already in the app. Check their installed types and docs
  before you write a replacement.
- Add a few meaningful tests for changed behavior. Prefer integration tests.
  Do not test facts that TypeScript already guarantees.
- Keep a working end-to-end path at each step. Check the user-visible result
  when the change affects a flow.
- Do not run `codex review` unless the user asks for it.
- If you learn a reusable, non-obvious detail, append one dated entry to
  [logs.md](logs.md) in the format shown there. Keep dated incidents out of
  this entry guide.

## Find the right area

| Work                                             | Start at                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes, layouts, metadata, and HTTP handlers     | [`apps/main/src/app/`](apps/main/src/app/) and [app guidance](apps/main/AGENTS.md)                                                                               |
| Shared UI                                        | [`apps/main/src/components/`](apps/main/src/components/); `ui/` contains shadcn components                                                                       |
| tRPC, auth, billing, search, and database access | [`apps/main/src/server/`](apps/main/src/server/)                                                                                                                 |
| Shared client-safe helpers and types             | [`apps/main/src/lib/`](apps/main/src/lib/) and [`apps/main/src/types/`](apps/main/src/types/)                                                                    |
| Prisma schema and data changes                   | [`apps/main/prisma/`](apps/main/prisma/) and [database migration workflow](apps/main/docs/db-migration.md)                                                       |
| Atlas visual flows                               | [agent development flywheel](apps/main/docs/agent-development-flywheel.md) and [`apps/main/scripts/atlas-flows.mjs`](apps/main/scripts/atlas-flows.mjs)          |
| Tests and verification                           | [`apps/main/tests/`](apps/main/tests/), [E2E guide](apps/main/docs/e2e-tests.md), and [agent development flywheel](apps/main/docs/agent-development-flywheel.md) |

See the [app docs index](apps/main/docs/README.md) for feature and operations
runbooks. The [implementation patterns guide](apps/main/docs/implementation-patterns.md)
collects examples of the current architecture.

## Local work and verification

Run commands from the repository root unless a linked guide says otherwise.
Use `pnpm` and keep service credentials in ignored environment files.

| Goal                                         | Command and guide                                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use representative local data                | `pnpm db:seed:prepare && pnpm dev`; [seeded development](apps/main/docs/realistic-data-local-development.md). `pnpm dev` uses that seed unless `DATABASE_URL` is set.                                                                 |
| Run focused Vitest tests                     | `pnpm main test -- tests/<file>.test.ts`                                                                                                                                                                                              |
| Check app code                               | `pnpm lint`, `pnpm typecheck`, `pnpm test`                                                                                                                                                                                            |
| Run the offline full-app integration harness | `node apps/main/scripts/run-integration-local.mjs`; [integration loop](apps/main/docs/agent-development-flywheel.md#integration-loop). It owns a disposable database and local providers.                                             |
| Capture an Atlas flow                        | `node apps/main/scripts/run-atlas-flow.mjs <flow-id> --output=local/atlas/current`; [Atlas loop](apps/main/docs/agent-development-flywheel.md#public-catalog-loop). Use a free `ATLAS_PORT` if another checkout has the default port. |
| Run connected browser E2E                    | `pnpm test:e2e`; [E2E guide](apps/main/docs/e2e-tests.md). Local runs manage a temporary database and server. Connected auth or payment flows need their configured services.                                                         |
| Test the production container locally        | [production-shaped Docker smoke](apps/main/docs/prod-like-local-docker-smoke.md). This uses a local database copy and production service configuration.                                                                               |

The seeded development path, offline integration harness, connected E2E,
and Docker smoke use different data and service boundaries. Use the guide for
the proof you need. Do not reuse another checkout's server, database, or port.

## Next.js and environment rules

Server Components are the App Router default. Put `"use client"` at a client
entry point that needs state, events, or browser APIs. Use `"use server"` for
Server Functions, not for every server-rendered component. The installed Next
docs are in `apps/main/node_modules/next/dist/docs/`; read the relevant guide
before you change framework behavior. Keep server-only modules out of client
imports. The managed Next.js note is in [app guidance](apps/main/AGENTS.md).

Use `@/` for app imports. Load configured development env values with
`pnpm env:dev <command>` when a script needs them. Add required variable names
to [`apps/main/.env.example`](apps/main/.env.example). Expose a value with
`NEXT_PUBLIC_` only when the browser needs it.
