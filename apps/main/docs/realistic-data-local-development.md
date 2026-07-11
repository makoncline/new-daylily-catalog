# Realistic-data local development

This workflow creates a local-only database from the latest production SQLite
snapshot, preserves realistic catalog content (including private notes), and
replaces production Clerk and Stripe bindings with stage/test identities.

It does not modify the source snapshot or the deterministic E2E seed.

This is separate from
[`prod-like-local-docker-smoke.md`](./prod-like-local-docker-smoke.md), which
runs the production Docker image locally with production-shaped runtime
configuration. This workflow runs the normal hot-reload development server with
realistic data and test services.

## Generate the snapshot

From `apps/main`:

```sh
pnpm realistic-data:prepare
```

The generator:

- finds the local production copy, or uses `REALISTIC_DATA_SOURCE_DB_PATH`;
- creates or reuses the configured users in the stage Clerk instance;
- creates or reuses customers in Stripe test mode;
- clears every production Clerk binding and every live Stripe identifier;
- preserves each production `active` or `trialing` visibility state under a
  synthetic local-only Stripe identifier, so the public catalog directory stays
  representative without contacting Stripe;
- maps only the personas in `scripts/realistic-data-personas.mjs` to real stage
  Clerk users and Stripe test-mode customers;
- writes the ignored database to `local/realistic-data/realistic-data.sqlite`.

The command refuses Clerk or Stripe production keys.

## Run with hot reload

```sh
pnpm realistic-data:dev
```

The app is available at <http://localhost:3012>. The launcher uses the stage
Clerk and Stripe test configuration while disabling Turso, AWS/SES, R2 writes,
Sentry uploads, PostHog, and image moderation calls.

## Login personas

| Catalog           | Email                                         | Code     |
| ----------------- | --------------------------------------------- | -------- |
| Rolling Oaks      | `prodlike+clerk_test_rollingoaks@example.com` | `424242` |
| PlantFancyGardens | `prodlike+clerk_test_plantfancy@example.com`  | `424242` |

Edit `scripts/realistic-data-personas.mjs` to add another selected source profile.
Regenerate the snapshot after changing the map.

Only the mapped personas can sign in. They use real Stripe test-mode customer
IDs and a local cached `active` subscription state. Other copied catalogs that
were active or trialing in the source remain publicly visible through synthetic
local-only customer IDs, but have no Clerk identity and cannot sign in. Nothing
creates a subscription or touches Stripe live mode.

## Agent UI atlas

With the realistic-data server running, capture the repeatable public and
authenticated UI states with:

```sh
pnpm agent:capture
```

The capture signs into both test personas with Clerk's fixed `424242` code,
saves reusable browser sessions under the ignored `local/agent-atlas/.auth`
directory, and currently produces 40 checkpoints covering:

- the home, membership, support, privacy, terms, sign-in, catalog directory,
  catalog search, public catalog, and listing-detail surfaces;
- every onboarding step, including empty, filled, invalid, upload, preview, and
  checkout states;
- desktop and mobile public catalog views;
- dashboard overview, listings, lists, and profile for both personas;
- basic listing search, the expanded advanced-filter panel, Create Listing,
  cultivar selection, Edit Listing, list membership, filtered lists, Create
  List, and the tag designer.

Every checkpoint attaches a full-page screenshot and JSON metadata. Every test
also attaches console errors, uncaught page errors, and failed requests. Failed
states retain Playwright screenshots, video, and trace files.

Open the browsable report with `pnpm agent:report`, or open
`http://localhost:9323/gallery.html` while that report server is running for the
single-page screenshot gallery. Artifacts and authentication state stay under
ignored `local/agent-atlas`.

Run the complete local gate with:

```sh
pnpm agent:verify
```

That command captures the atlas, then runs TypeScript and lint checks. The
deterministic E2E suite remains separate and continues to own its databases
under `tests/.tmp`.

## Targeted visual feedback loop

After reviewing a full capture, approve it as the local reference with:

```sh
pnpm agent:baseline
```

For normal development, use:

```sh
pnpm agent:verify:changed
```

The changed-file mapper selects the smallest useful story group: public,
onboarding, dashboard routes, or dashboard interactions. Shared and unknown app
changes intentionally fall back to the full atlas. Override Git discovery when
needed with a comma- or newline-separated file list in
`AGENT_ATLAS_CHANGED_FILES`.

The visual comparison uses a `0.1%` changed-pixel review threshold by default
and writes:

- `local/agent-atlas/report/visual-review.html` for baseline/current/diff review;
- `comparison.json` for agents and automation;
- `comparison.md` for a compact human summary;
- magenta-highlighted difference images under `comparison-assets`.

Any new or materially changed checkpoint fails the verification until it is
reviewed. After confirming an intentional change, run `pnpm agent:baseline` to
approve the current 40 screenshots. Set `AGENT_ATLAS_DIFF_PERCENT` only when a
different review threshold is deliberately needed.

## One-command agent loop

Run `pnpm agent:loop` for the normal code-change loop. It reuses a healthy app
on port 3012. Otherwise it prepares a missing realistic database, starts the
realistic-data server, waits for `/catalogs`, and stops only the server it
started. It then runs changed-file UI selection, visual comparison, typecheck,
and lint. Timings are written to `local/agent-atlas/report/agent-loop.json`.

Focused forms:

```sh
pnpm agent:loop -- --story onboarding --ui-only
pnpm agent:loop -- --story dashboard-interactions
pnpm agent:loop -- --full
pnpm agent:loop -- --keep-server
pnpm agent:loop -- --full --build
```

The gallery and visual review identify route, persona/project, viewport, story,
browser diagnostics, and the exact story rerun command.
Production builds are opt-in because they are not part of the fast UI loop;
`--build` uses development test-service keys with production build semantics,
disables uploads and external observability, and records duration in the same
timing report.

## Portable visual baselines

Baselines remain ignored because the 40 PNGs are about 60 MB. Export a reviewed
baseline as a compressed, provenance-bearing artifact:

```sh
pnpm agent:baseline
pnpm agent:baseline:export
```

This creates
`local/agent-atlas/daylily-agent-atlas-baseline.tar.gz`. Transfer it to another
checkout, then import it with:

```sh
pnpm agent:baseline:import -- /absolute/path/to/daylily-agent-atlas-baseline.tar.gz
```

Import verifies the manifest version and screenshot count. Approve a baseline
only after reviewing `visual-review.html`.

## Failure-contract verification

The normally skipped diagnostics test deliberately creates a console error and
failed request:

```sh
AGENT_ATLAS_SIMULATE_FAILURE=1 pnpm exec playwright test \
  -c playwright.agent-atlas.config.ts \
  diagnostics.atlas.ts --project=anonymous-desktop
```

The command must fail and retain diagnostics, trace, video, and screenshot.
Regenerate the gallery with a normal capture afterward so deliberate failure
evidence is not left as the current product state.

## Timing and troubleshooting

Use `agent-loop.json` when changing concurrency or caching. Targeted UI-only
loops avoid authentication and unrelated stories; full loops intentionally
authenticate both personas. Keep authenticated dashboard projects serialized
because they share realistic data and exercise large catalogs.

If startup fails, confirm the snapshot exists and stage Clerk/Stripe keys use
test prefixes. If authentication fails, rerun `pnpm agent:auth`. If a visual
change is expected, inspect the diff before `pnpm agent:baseline`. Failure-only
traces and videos live under `local/agent-atlas/test-results`.
