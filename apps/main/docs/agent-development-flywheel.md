# Agent development flywheel

Use this loop after changing application code. Run commands from `apps/main`; package scripts intentionally expose only normal project entrypoints.

## Default loop

1. During focused implementation, run the relevant full-app integration flow.
   Playwright owns the temporary database and server for this command:

   ```sh
   pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"
   ```

2. For exploratory browser work, start the same offline app and use browser
   automation like a user. Navigate from visible UI and inspect console errors
   and failed requests:

   ```sh
   node scripts/run-integration-local.ts
   ```

   Exploratory runs reset their database by default. To restart the same named
   browser database without losing work created through the UI:

   ```sh
   HERMETIC_DB_NAME=my-browser-session.sqlite HERMETIC_REUSE_DB=1 node scripts/run-integration-local.ts
   ```

   To run Playwright against that already-running process, attach explicitly:

   ```sh
   BASE_URL=http://localhost:3200 pnpm exec playwright test -c playwright.integration.config.ts --grep "listing filters"
   ```

3. Run the normal verification loop. It captures affected visual states, then
   runs the complete Vitest suite, typecheck, lint, and every hermetic full-app
   integration flow. The measured local baseline is about two minutes:

   ```sh
   node scripts/agent-loop.mjs
   ```

   Changed-file selection includes committed branch changes against
   `origin/main`, working-tree changes, and untracked files. Set
   `AGENT_ATLAS_BASE_REF` when reviewing a stacked branch against a different
   base.

4. Inspect `local/agent-atlas/report/visual-review.html`. On first use, the loop
   captures the full Atlas and initializes a clearly unapproved local reference.
   Visual comparison remains pending until that reference is explicitly
   approved. Approve intentional visual changes only after review:

   ```sh
   node scripts/agent-atlas-baseline.mjs
   ```

## Useful variants

```sh
# All full-app integration flows
pnpm exec playwright test -c playwright.integration.config.ts

# One visual story
node scripts/agent-loop.mjs --story onboarding --ui-only

# One user flow, preserving every unrelated Atlas capture
node scripts/agent-loop.mjs --flow print-tags --ui-only --realistic-data

# Complete visual and static verification
node scripts/agent-loop.mjs --full

# Add every connected happy-path E2E flow before a PR or risky handoff
node scripts/agent-loop.mjs --e2e

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

## Integration boundaries

Integration runs keep the browser, Next.js, tRPC, native network clients, and
temporary SQLite database real. They replace only external boundaries:

- Clerk supplies the selected authenticated principal; application user and
  cached Clerk data still come from the real local database.
- The production Stripe SDK sends its normal requests through a small set of
  MSW boundary handlers loaded inside the guarded Next.js process. Only
  checkout scenario state is persisted, in the run-scoped temporary SQLite
  database, so abandoned and completed checkouts remain distinct across Next
  workers. Unknown outbound requests fail instead of reaching the internet.
- Image uploads use the normal browser and application flow, with bytes written
  to `tests/.tmp` instead of R2 or S3.
- Inquiry emails use the production message-building code and are captured in
  the local database instead of SES. Inspect them at `/local/email`.
- Sentry, PostHog, Telegram alerts, and image moderation stay disabled unless a
  focused test explicitly covers that integration.

Do not intercept this application's own routes or build stateful replicas of
external providers. Keep connected E2E for the few contracts that require real
development Clerk, Stripe test mode, R2, or SES.

Use the realistic-data mode for the canonical visual Atlas. It captures the
production-shaped Rolling Oaks and PlantFancy catalogs while leaving hermetic
integration tests isolated and deterministic. Account variants that should not
be invented in the production-derived database are appended from the guarded
hermetic runtime. After the realistic-data capture has stopped, run:

```sh
AGENT_ATLAS_APPEND=1 node scripts/run-hermetic-atlas.mjs
```

The appended pass adds empty-account, free-tier limit, past-due, canceled,
checkout-return, and profile-media states without replacing realistic catalog
screenshots. A normal full run cleans first; the append flag is intentionally
required whenever an additional runtime contributes to the same gallery.

The Atlas home page is organized by public and member user flows. Each flow page
lists its steps in order, shows every captured state, and keeps missing states
visible as coverage work instead of hiding them in an unstructured screenshot
gallery. Use each card's **Open in local app** link to move directly from the
screenshot into the matching local route and URL state; authenticated routes
use the account already signed into that browser. A flow rerun selects only test
files and browser projects that produced that flow's states, updates those
captures in place, and compares only those exact states so unrelated baselines
cannot appear removed. “100%” means all declared states have captures; expand the manifest
whenever a route or high-value E2E journey exposes a missing product flow. The
raw checkpoint inventory remains available from the `All checkpoints` link.

## First-use constraints

- When replacing internals behind an existing page, preserve the current UI and
  interaction contract by default. A separate route may use new components, but
  compare it with the existing route and require an explicit user benefit for
  every intentional visual difference.
- Use one broad browser snapshot to orient, then switch to scoped locators,
  `data-testid` reads, or a bounded DOM projection. Wide data tables produce very
  large accessibility snapshots that slow the agent without adding signal.
- Browser exploration and Playwright integration are complementary. The in-app
  browser is effective for navigation, forms, and visual judgment, while image
  upload currently stays in Playwright because the browser controller cannot
  populate a file input.
- After hot reload or page reload, wait for the dashboard loading overlay to
  finish its exit transition before judging screenshots. Functional elements can
  become available slightly before the overlay is visually gone.
- Next.js permits only one dev server per app directory. A visible exploratory
  server and a Playwright-managed integration server therefore cannot run from
  this checkout concurrently, even on different ports. Use another checkout for
  true concurrency, or stop the exploratory server and restart its named database
  with `HERMETIC_REUSE_DB=1` afterward.
