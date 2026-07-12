# Full-app integration development and tests

Full-app integration runs the real Next.js application completely offline. It uses
the real React UI, navigation, tRPC routes, application services, and a fresh
temporary SQLite database. Only third-party boundaries are replaced locally.

This is ordinary local development with deterministic test data. It is
separate from both `realistic-data:dev` (stage Clerk and Stripe test mode with
prod-shaped data) and the prod-like Docker smoke process.

## Commands

- Start the browserable app: `pnpm exec tsx scripts/run-integration-local.ts`
- Run the full browser integration suite (it owns its server): `pnpm exec playwright test -c playwright.integration.config.ts`
- Run one flow: `pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"`
- Run one flow against an already-running app: `BASE_URL=http://localhost:3200 pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"`
- Capture the Atlas without third parties: `node scripts/run-integration-atlas.mjs`
- Open the report: `pnpm exec playwright show-report local/integration/report`

The app defaults to `http://localhost:3200`. The launcher always recreates its
database under `apps/main/tests/.tmp`, validates the local origin and database,
rejects live Clerk/Stripe secrets, disables synthetic tRPC latency, and turns
off external observability.

## Personas

Open `/sign-in` and select a persona. No OTP is required.

- `pro-primary`: active seller with 36 listings
- `pro-secondary`: trialing seller with 12 listings
- `new-unpaid`: blank account reserved for onboarding claim tests
- `billing-past-due` and `billing-canceled`: billing recovery states
- `workflow-seller`: isolated create/edit workflow records
- `profile-editor`: isolated profile mutation records
- `checkout-unpaid`: isolated upgrade/checkout records

Each browser scenario resets the database through an integration-only route before
it starts. Purpose-specific personas also make a scenario's intent obvious and
prevent unrelated records from being coupled inside one flow.

## Local boundaries

- Clerk imports resolve to local client/server adapters only in the guarded
  integration process. Normal builds still resolve the real Clerk packages.
- Stripe prices, customers, checkout, portal, and subscription states use the
  local simulator. `/hermetic/stripe/checkout` is never available normally.
- Browser image uploads PUT to `/api/hermetic/images/*` and persist under the
  run's temporary directory before the real image-attachment mutation runs.
- Onboarding checkout and profile-image import use the existing local checkout
  store in SQLite.
- Buyer inquiry emails are captured as SQLite events. Inspect them at
  `/api/hermetic/events`.
- PostHog, Sentry, Telegram, and moderation are disabled unless a scenario
  explicitly provides a local handler.

Every full-app test installs a browser route gate that throws on non-local HTTP
or WebSocket traffic and attaches `network-ledger.json` to its result. The
server process independently blocks non-loopback sockets before DNS. Unhandled
external requests are test failures, not warnings.

## Choosing a mode

- Use the integration environment for most code/UI iteration, agent browser navigation,
  screenshots, and happy-path integration coverage.
- Use `realistic-data:dev` when production-shaped scale or stage Clerk/Stripe
  behavior matters.
- Use connected E2E for the smaller set of Clerk OTP, real Stripe test mode,
  signed provider protocol, and deploy-preview checks.

Do not mock the app's tRPC/API routes, database, components, or navigation in
integration tests. Add a local adapter only at a true third-party boundary.

## Verified baseline

On July 11, 2026, the local verification completed with:

- 10 full-app integration flows in 1 minute 6 seconds
- 27 active Atlas scenarios producing a 40-image gallery in 1 minute
- 501 Vitest unit/integration tests in 24 seconds
- 14 unchanged connected E2E flows in 2 minutes 56 seconds
- ESLint, native TypeScript, and legacy TypeScript checks passing

Use complete command wall time for future comparisons. Do not compare an
individual route compile or test body against these end-to-end baselines.
