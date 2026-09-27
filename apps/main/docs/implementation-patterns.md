# Implementation patterns from product flows

Start with the [Atlas flow registry](../scripts/atlas-flows.mjs) when a change affects a user journey. It names the UI states and the available test commands. The examples below are production code. Follow the listed boundaries when you use a pattern for new work.

## Public server read

Use this pattern for a public page that needs seller and listing data. [Profile page data](<../src/app/(public)/[userSlugOrId]/_lib/public-profile-route.ts>) resolves the seller, loads the public summary and a bounded listing page, then returns the data for server rendering. [Published listing reads](../src/server/db/public-listing-read-model.ts) use the read replica. The page ID and count queries filter hidden listings before card retrieval. Keep that filter on both queries, and use only those IDs to fetch cards. Keep core profile and listing content in the first HTML response.

Behavioral checks: [public profile route test](../tests/public-profile-route.test.ts) (`pnpm main exec vitest run tests/public-profile-route.test.ts`) and [first-response browser test](../tests/e2e/public-profile-first-response.e2e.ts) (`pnpm main exec playwright test --retries=0 tests/e2e/public-profile-first-response.e2e.ts`).

## Authenticated mutation

Use this pattern for a member write. The [listing router](../src/server/api/routers/dashboard-db/listing.ts) uses `protectedProcedure`, validates input, and takes the user ID from the request context. Its update path checks ownership and includes the user ID in `updateMany`. A client-provided listing ID does not prove ownership. Keep entitlement checks on the server when a write can exceed a plan limit.

Behavioral checks: [listing entitlement integration test](../tests/dashboard-db-listing-entitlements.integration.test.ts) (`pnpm main exec vitest run tests/dashboard-db-listing-entitlements.integration.test.ts`) and [create/edit full-app test](../tests/integration/create-edit-listing.integration.ts) (`node apps/main/scripts/run-integration-local.mjs tests/integration/create-edit-listing.integration.ts`).

## Form validation and save

Use this pattern for an edit surface with unsaved data. The [listing form](../src/components/forms/listing-form.tsx) uses the [listing schema](../src/types/schemas/listing.ts) to validate values before a manual save. It shows field errors, awaits the write, reports a failed save, and closes the edit surface only after success. Keep pending changes available when validation or the write fails. The server must validate the same write boundary.

Behavioral check: [create/edit full-app test](../tests/integration/create-edit-listing.integration.ts) (`node apps/main/scripts/run-integration-local.mjs tests/integration/create-edit-listing.integration.ts`). Its second case confirms that an empty name cannot persist.

## Full app persistence test

Use this pattern when a user action must survive a fresh request. The [create/edit listing integration test](../tests/integration/create-edit-listing.integration.ts) uses the application, its real router, and a disposable database. It creates and edits a listing, opens the page again, and checks saved title, description, price, private note, status, and list membership. Check the value after navigation or reload, rather than only checking a toast or client state. The [integration runner](../scripts/run-integration-local.mjs) starts the isolated app for this test.

Behavioral command: `node apps/main/scripts/run-integration-local.mjs tests/integration/create-edit-listing.integration.ts`.
