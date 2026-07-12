# Agent development flywheel

Use this loop after changing application code. Run commands from `apps/main`; package scripts intentionally expose only normal project entrypoints.

## Default loop

1. Run the relevant full-app integration flow. Playwright owns the temporary
   database and server for this command:

   ```sh
   pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"
   ```

2. For exploratory browser work, start the same offline app and use browser
   automation like a user. Navigate from visible UI and inspect console errors
   and failed requests:

   ```sh
   pnpm exec tsx scripts/run-integration-local.ts
   ```

   To run Playwright against that already-running process, attach explicitly:

   ```sh
   BASE_URL=http://localhost:3200 pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"
   ```

3. Capture affected visual states and run related checks. This command owns or
   reuses the offline integration server:

   ```sh
   node scripts/agent-loop.mjs
   ```

4. Inspect `local/agent-atlas/report/visual-review.html`. On first use, the loop
   captures the full Atlas and initializes a clearly unapproved local reference.
   Approve intentional visual changes only after review:

   ```sh
   node scripts/agent-atlas-baseline.mjs
   ```

## Useful variants

```sh
# All full-app integration flows
pnpm exec playwright test -c playwright.integration.config.ts

# One visual story
node scripts/agent-loop.mjs --story onboarding --ui-only

# Complete visual and static verification
node scripts/agent-loop.mjs --full

# Production build as an explicit slow gate
node scripts/agent-loop.mjs --full --build

# Screenshot gallery using the offline integration data
node scripts/run-integration-atlas.mjs

# Production-shaped data with stage services (explicit opt-in)
node scripts/agent-loop.mjs --realistic-data

# Serve the Playwright report
pnpm exec playwright show-report local/agent-atlas/report
```

Use realistic-data development only when production-shaped scale or stage Clerk/Stripe behavior matters. Use connected E2E only for the small set of critical happy paths that must prove real stage-service contracts. Integration tests remain offline and deterministic by default.
