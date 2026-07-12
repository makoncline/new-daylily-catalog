# Agent development flywheel

Use this loop after changing application code. Run commands from `apps/main`; package scripts intentionally expose only normal project entrypoints.

## Default loop

1. Start the offline integration app:

   ```sh
   pnpm exec tsx scripts/run-hermetic-local.ts
   ```

2. Use browser automation like a user: navigate from visible UI, exercise the changed state, and inspect console errors and failed requests.
3. Run the relevant full-app integration flow:

   ```sh
   pnpm exec playwright test -c playwright.hermetic.config.ts --grep "listing filters"
   ```

4. Capture affected visual states and run related checks:

   ```sh
   node scripts/agent-loop.mjs
   ```

5. Inspect `local/agent-atlas/report/visual-review.html`. Approve intentional visual changes only after review:

   ```sh
   node scripts/agent-atlas-baseline.mjs
   ```

## Useful variants

```sh
# All full-app integration flows
pnpm exec playwright test -c playwright.hermetic.config.ts

# One visual story
node scripts/agent-loop.mjs --story onboarding --ui-only

# Complete visual and static verification
node scripts/agent-loop.mjs --full

# Production build as an explicit slow gate
node scripts/agent-loop.mjs --full --build

# Screenshot gallery using the offline integration data
node scripts/run-hermetic-atlas.mjs

# Serve the Playwright report
pnpm exec playwright show-report local/agent-atlas/report
```

Use realistic-data development only when production-shaped scale or stage Clerk/Stripe behavior matters. Use connected E2E only for the small set of critical happy paths that must prove real stage-service contracts. Integration tests remain offline and deterministic by default.
