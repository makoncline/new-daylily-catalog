# Agent development flywheel

The flywheel is organized by user flow. For each flow, establish a visual and
test baseline, change the app, then rerun the same evidence.
## Confidence layers

- **Atlas screenshots** document declared meaningful UI states. A capture may
  navigate directly to a state; it does not prove the user journey.
- **Integration tests** exercise the real app in detail, replacing only
  external network boundaries.
- **Connected E2E tests** prove the most important complete happy paths through
  visible UI and real stage-service contracts.
- **Unit tests** cover isolated logic. A flow may legitimately have none.
The gallery lists every test currently associated with its flow. Missing layers
remain visible instead of being converted into a misleading coverage score.
## Public catalog loop

From the repository root:

```sh
node apps/main/scripts/run-atlas-flow.mjs public-catalog --output=local/atlas/before
```
Open the absolute `index.html` path printed by the command and run the tests
listed there. After making a change:

```sh
node apps/main/scripts/run-atlas-flow.mjs public-catalog --output=local/atlas/after
pnpm test
pnpm typecheck
pnpm lint
```
Compare the retained `before` and `after` galleries. “Open live” appears only
for states fully represented by their URL; interaction-only states provide an
exact Playwright reproduction command instead.
Atlas uses the standard realistic seeded development database and does not
write to it. If it is missing, run `pnpm db:seed:prepare`.
