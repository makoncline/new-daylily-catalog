# Agent development flywheel

The flywheel is organized by user flow. For each flow, establish a visual and
test baseline, change the app, then rerun the same evidence.

## Browser-first UI loop

For a UI change, use the app in visible Chrome before editing and again after
the change. Follow the normal controls a user sees; do not substitute hidden
controls, direct API calls, or database edits. Atlas captures do not replace
this walkthrough.

Visible-browser verification must finish with zero Next development issues.
Open and inspect every issue the badge reports. Fix narrow tooling or test
problems in the current slice when appropriate; split production application
defects into a separate change before continuing. Never hide or crop out the
badge as a screenshot workaround.

Generate separate before and after galleries, then open and inspect every
affected screenshot. A passing capture only proves that the state was created;
it does not prove that the design is correct. Check the complete page or
component for clipping, overflow, missing content, and unintended layout
changes.

### Selecting local files in Chrome

Use Chrome's file-chooser event for normal agent walkthroughs. Start waiting
before clicking the real visible upload control, then give the chooser an
absolute local path:

```js
const chooserPromise = tab.playwright.waitForEvent("filechooser", {
  timeoutMs: 10_000,
});
await uploadControl.click();
const chooser = await chooserPromise;
await chooser.setFiles(["/absolute/path/to/test-image.webp"], {
  timeoutMs: 10_000,
});
```

This skips only the macOS picker. It still exercises the real file input,
change event, and application preview or crop UI. Do not click the final
Upload button unless the walkthrough explicitly authorizes the resulting
network and data mutation.

If `setFiles` reports `Not allowed`, enable **Allow access to file URLs** in
the ChatGPT Chrome Extension details. Use the native macOS picker only when
testing that picker specifically: click the visible control with Computer
Use, press `Cmd+Shift+G`, enter the absolute path, select the file, and click
Open. Cancel the application's pre-upload state when the investigation is
complete.

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

## Integration loop

```sh
node apps/main/scripts/run-integration-local.mjs
node apps/main/scripts/run-integration-local.mjs tests/integration/create-edit-listing.integration.ts
```

The runner owns a unique database under `tests/.tmp`, authenticates one fixed
seller through a narrow Clerk seam, and deletes the database afterward. It
rejects nonlocal URLs/databases, live credentials, and outbound requests.
Buyer inquiries still use the real SES SDK request path, but the local provider
prints each captured email in the terminal and exposes the mailbox at
`http://127.0.0.1:3211/__emails` for integration assertions. Clear it with
`DELETE /__emails`; do not add an SMTP transport or a second email
implementation.

Ordinary `pnpm dev` remains the realistic seeded-data environment. Integration
mode is test infrastructure, not a second development mode or test category.
