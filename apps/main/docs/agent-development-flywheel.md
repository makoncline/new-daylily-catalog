# Agent development flywheel

The flywheel is organized by user flow. For each flow, establish a visual and
test baseline, change the app, then rerun the same evidence.

## Browser-first UI loop

For a UI change, use the app in visible Chrome before editing and again after
the change. Follow the normal controls a user sees; do not substitute hidden
controls, direct API calls, or database edits. Atlas captures do not replace
this walkthrough.

Generate separate before and after galleries, then open and inspect every
affected screenshot. A passing capture only proves that the state was created;
it does not prove that the design is correct. Check the complete page or
component for clipping, overflow, missing content, and unintended layout
changes.

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
node apps/main/scripts/run-atlas-flow.mjs all --output=local/atlas/current
node apps/main/scripts/run-atlas-flow.mjs public-catalog --output=local/atlas/before
```

Available flow IDs are declared in
`apps/main/scripts/atlas-flows.mjs`. Use an ID with the same runner to capture
one flow, or use `all` to generate the linked Atlas home page.

The `all` command keeps one Turbopack server alive while capturing every flow
and creates a home page linking the galleries. Open the absolute `index.html`
path printed by the command and run the tests listed there. After making a
change:

```sh
node apps/main/scripts/run-atlas-flow.mjs public-catalog --output=local/atlas/after
pnpm test
pnpm typecheck
pnpm lint
```

Compare the retained `before` and `after` galleries. “Open live” appears only
for states fully represented by their URL; interaction-only states provide an
exact Playwright reproduction command instead.
Atlas validates the standard realistic seed against the current Prisma schema,
then runs against a disposable copy. Captures cannot modify the canonical
development seed. If the seed is missing or stale, the runner stops with the
single recovery command: `pnpm db:seed:prepare`.

In a restricted agent environment, starting the local Next server may require
elevated permission to bind its port. Rerun the Atlas command with that
permission; do not change the app or test flow to work around the restriction.

## Catalog mass import loop

The current product and file contract are documented in
[`catalog-list-cleaner.md`](./catalog-list-cleaner.md). The public flow is the
spreadsheet preparation, matching, preview, and analysis stage of catalog mass
import. It produces a copy of the original workbook with stable cultivar
identity columns added; database writes belong to the later paid/dashboard
continuation.

For a focused before/after pass:

```sh
node apps/main/scripts/run-atlas-flow.mjs catalog-importer --output=local/atlas/catalog-cleaner-before
node apps/main/scripts/run-atlas-flow.mjs catalog-importer --output=local/atlas/catalog-cleaner-after
```

In the visible Chrome walkthrough, use a real spreadsheet and confirm the
download keeps every original cell value, column, and sheet, then adds:

```text
Daylily Catalog ID,registeredCultivarName,cultivarUrl
```

The preview reuses the full `PublicCatalogSearchAdvancedPanel`, shared filter
registry, and shared catalog-search columns. Its cultivar mode adds the same
exact multi-select hybridizer, awards, Flower Show, and sculpted-type facets as
the `/cultivars` search. The matching response must carry those indexed
cultivar fields so filtering remains browser-side after matching. Importer
matching and card rendering remain importer-owned; filter labels, semantics,
facets, ranges, active-filter summaries, and responsive panel behavior remain
shared.

## Integration loop

```sh
node apps/main/scripts/run-integration-local.mjs
node apps/main/scripts/run-integration-local.mjs tests/integration/create-edit-listing.integration.ts
```

The runner owns a unique database under `tests/.tmp`, authenticates one fixed
seller through a narrow Clerk seam, and deletes the database afterward. It
rejects nonlocal URLs/databases, live credentials, and outbound requests.

Ordinary `pnpm dev` remains the realistic seeded-data environment. Integration
mode is test infrastructure, not a second development mode or test category.
