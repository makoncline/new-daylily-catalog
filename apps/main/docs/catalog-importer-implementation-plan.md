# Catalog Importer Implementation Plan

This is the working tracker for completing the catalog importer as a
Pro-grade spreadsheet-preparation workspace. It is intentionally operational:
the active goal agent should update this file while working, and the user
should be able to open the first sections at any time to understand progress,
decisions, evidence, and blockers.

## Live status

| Field           | Current value                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Overall status  | Implementation in progress                                                                                |
| Current phase   | Phase D — Export and continue                                                                             |
| Current slice   | Slice 10 — Add honest guest/member continuation                                                           |
| Last updated    | 2026-07-18                                                                                                |
| Branch          | `agent/catalog-importer-v1`                                                                               |
| Baseline commit | `7b5a81ad`                                                                                                |
| Pull request    | [#352 — Prepare daylily catalog spreadsheets](https://github.com/makoncline/new-daylily-catalog/pull/352) |
| Current blocker | None                                                                                                      |
| Next action     | Audit current membership state, sign-in return behavior, prompt placement, and shipped Pro promises       |
| Latest evidence | Slice 9 passed 39 focused tests, 3 E2Es, typecheck, lint, and a real three-sheet XLSX download/open check |

### Progress

- [x] Phase A — Contract and state foundation
  - [x] Slice 0 — Verify and freeze the cleaned-workbook contract
  - [x] Slice 1 — Make importer state, provenance, and counts explicit
- [x] Phase B — Reveal and explore
  - [x] Slice 2 — Refine upload, mapping, persistence, and processing feedback
  - [x] Slice 3 — Build the personalized results reveal and workspace order
  - [x] Slice 4 — Make catalog preview trusted and useful
  - [x] Slice 5 — Make collection insights accurate and interactive
  - [x] Slice 6 — Add persistent workspace status and navigation
- [x] Phase C — Repair
  - [x] Slice 7 — Complete cultivar review, revision, and undo
  - [x] Slice 8 — Complete spreadsheet issue repair
- [ ] Phase D — Export and continue
  - [x] Slice 9 — Complete the prepared-workbook download experience
  - [ ] Slice 10 — Add honest guest/member continuation
- [ ] Phase E — Hardening and closeout
  - [ ] Slice 11 — Fix mobile and accessibility blockers
  - [ ] Slice 12 — Verify large-workbook performance and add only proven scaling controls
  - [ ] Slice 13 — Complete analytics, Atlas, documentation, and real-workbook proof

### Current-slice notes

Use this area for short-lived details needed to resume the active slice.
Move durable decisions to the decision log and completed work to the work log.

- Slice 9 is complete and ready to package for PR #352.
- Begin Slice 10 by reusing existing membership identity and seller-intent
  patterns; do not introduce a new audience or funnel framework.
- Keep every preparation and download capability available to guests.
- Do not promise direct workbook import or one-click publishing.

### User update

Use this as the source for concise progress updates.

> Slice 9 is complete: current and prepared downloads now have accurate labels,
> a pre-download contract summary, stable prepared filenames, explicit
> CSV/XLSX and fidelity behavior, and retryable failure copy. The real
> three-sheet workbook downloaded and reopened with all sheet values intact
> outside the selected sheet and only the three identity columns added.

## How the goal agent must use this file

1. Read **Live status**, **Current-slice notes**, **Decision log**, and the
   active slice before making changes.
2. Update the current phase, slice, date, blocker, next action, and user update
   when starting or resuming work.
3. Work on one slice at a time. Do not opportunistically implement later
   slices unless a small prerequisite is unavoidable.
4. Keep each slice to one reviewable implementation commit when practical.
5. Prefer existing components and direct state transitions. Do not create a
   generic workflow engine, command bus, or new context unless the active slice
   proves it is necessary.
6. Write a small number of high-signal tests, primarily integration tests.
   Do not test behavior guaranteed by TypeScript.
7. Use the real page in visible Chrome for user-path verification. Atlas is
   deterministic state coverage, not a substitute for the real workbook.
8. After each slice:
   - mark completed checklist items;
   - record tests and visible evidence;
   - append a work-log entry;
   - update the next slice and user update;
   - commit and push the slice;
   - send the user a concise outcome, evidence, and next action.
9. If blocked, record the exact blocker and all attempted safe alternatives.
   Keep working on other in-slice tasks that do not depend on the blocker.
10. Do not run nested or automatic Codex reviews. The user will trigger a
    Codex review when wanted.
11. Do not mark the goal complete until every phase is checked and all final
    exit gates pass.

## Product contract

### Purpose

The page turns an existing seller spreadsheet into a catalog-ready collection.
It identifies registered cultivars, reveals the richer catalog enabled by
those identities, helps the seller resolve uncertain names and spreadsheet
problems, and returns a useful prepared workbook.

This version does not create database listings and does not publish a catalog.
The richer preview demonstrates what Daylily Catalog can provide; a future
paid importer can consume the prepared workbook.

### Narrative

`Reveal → Explore → Repair → Export → Continue`

1. Reveal the catalog already present in the spreadsheet.
2. Let the seller explore linked photos, registry data, filters, and insights.
3. Explain which rows could not receive those benefits.
4. Help the seller resolve uncertain identity and spreadsheet issues.
5. Export a cleaned, catalog-ready copy of the workbook.
6. Present Pro as the hosted catalog and seller-dashboard continuation.

### Capability boundary

| Area                | This plan delivers                                               |
| ------------------- | ---------------------------------------------------------------- |
| Input               | Existing XLSX or CSV                                             |
| Processing          | Browser-local workbook processing and persistence                |
| Matching            | Automatic confident links plus explicit manual review            |
| Preview             | Seller data combined with live Daylily Catalog reference data    |
| Insights            | Calculated from linked unique cultivars                          |
| Repair              | Cultivar decisions and supported spreadsheet corrections         |
| Output              | A cleaned copy with approved values and stable cultivar identity |
| Database            | No listing writes                                                |
| Publishing          | Nothing published                                                |
| Membership          | Not required to finish or download                               |
| Future continuation | Prepared workbook becomes input to a paid import flow            |

The governing phrase is **Pro-grade, not Pro-gated**.

### Cleaned-download contract

The uploaded file remains untouched. Download creates a new prepared copy.

The selected listing sheet should:

- retain columns that Daylily Catalog does not own;
- retain worksheets other than the selected listing sheet;
- retain included unmatched rows;
- remove a row only after the seller explicitly chooses to exclude it from
  the prepared workbook;
- replace the mapped listing name with the registered cultivar name when a
  cultivar link is accepted;
- preserve the seller's original name when the row remains unmatched;
- write a normalized numeric price or an approved blank when the seller
  resolves a price-format issue;
- preserve the original price in an unresolved current-workbook download;
- apply only safe whitespace normalization to mapped description and private
  note values unless the seller explicitly changes them;
- write an approved, normalized image URL when one exists;
- preserve the original image value when its issue remains unresolved; and
- clear a known-invalid saved ID from the prepared identity field while
  retaining the source row; and
- add the identity columns defined below.

Visible identity columns:

| Column                          | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `Daylily Catalog ID`            | Stable cultivar identity and future import key |
| `Daylily Catalog Cultivar Name` | Human-readable registered cultivar name        |
| `Daylily Catalog Cultivar URL`  | Durable link back to the cultivar page         |

The ID is authoritative. The cultivar name is display and diagnostic data, not
a foreign key. Re-upload should recognize these headers and supported legacy
headers without asking the seller to map the ID column.

The download is a data reconstruction, not a general Excel editor. Product
copy must accurately disclose the verified behavior for formulas, formatting,
merged cells, drawings, comments, macros, validation, and hidden state.

## Decision log

| Date       | Decision                                                                                       | Reason                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-18 | Build the complete preparation experience before adding a paywall.                             | The product needs to prove its full value before deciding which future import or publishing capabilities to gate.                       |
| 2026-07-18 | Keep the preview before repair.                                                                | Photos, filters, and insights provide the immediate value reveal that motivates cleanup.                                                |
| 2026-07-18 | Download a cleaned copy while leaving the uploaded file untouched.                             | Sellers want useful corrected data, but the browser flow must not mutate their source file.                                             |
| 2026-07-18 | Use `Daylily Catalog ID` as the future import identity.                                        | Names and normalization rules can change; a validated stable ID is unambiguous.                                                         |
| 2026-07-18 | Keep uncertain candidates out of preview and insights.                                         | One conspicuously incorrect photo damages trust in every match.                                                                         |
| 2026-07-18 | Keep one-at-a-time cultivar review but show issue groups together.                             | Identity is a judgment task; price and duplicate repair benefit from comparison and batch context.                                      |
| 2026-07-18 | Use cards only for listings, search/filter surfaces, and discrete match choices.               | Most workspace sections need hierarchy, not decorative containers.                                                                      |
| 2026-07-18 | Reuse the shared catalog search registry and controlled components.                            | Search labels and filter semantics should not diverge across importer and existing catalog surfaces.                                    |
| 2026-07-18 | Prefer event-driven transitions and derived selectors; add no new synchronization `useEffect`. | This avoids the render loops and split state ownership already encountered in the importer.                                             |
| 2026-07-18 | Do not add a metadata sheet or speculative import fields yet.                                  | The current output needs only the three stable identity fields; future import requirements should justify additional schema.            |
| 2026-07-18 | Clear known-invalid saved IDs from prepared identity fields.                                   | Without a separate match-state column, retaining an invalid ID could make a future importer treat unresolved identity as authoritative. |
| 2026-07-18 | Keep automatic Codex review outside this goal.                                                 | The user will explicitly trigger review when desired.                                                                                   |

## Phase A — Contract and state foundation

### Slice 0 — Verify and freeze the cleaned-workbook contract

**Outcome:** The implementation, tests, and documentation agree on exactly
what a prepared download changes and preserves.

Tasks:

- [x] Inspect current CSV and XLSX generation without changing it.
- [x] Exercise all three supplied sample workbooks.
- [x] Exercise the real 1,087-row, three-sheet workbook in visible Chrome.
- [x] Inventory current behavior for mapped values, other columns, other
      worksheets, formulas, formatting, merges, drawings, comments, validation,
      hidden state, duplicate removal, and legacy identity columns.
- [x] Write focused integration tests for the accepted output contract.
- [x] Implement the cleaned-download rules in **Cleaned-download contract**.
- [x] Rename output headers to the three approved `Daylily Catalog …` names.
- [x] Continue recognizing supported legacy ID/name/link headers on re-upload.
- [x] Keep Daylily Catalog ID mapping automatic and absent from column mapping.
- [x] Update `catalog-list-cleaner.md` to match verified behavior.
- [x] Verify the prepared XLSX opens correctly in a spreadsheet application.

Acceptance:

- [x] The uploaded source file is never modified.
- [x] A linked row receives the registered name, validated ID, and URL.
- [x] An unmatched row retains its original name.
- [x] Approved price, image, and duplicate decisions appear in the prepared
      file with their documented meaning.
- [x] An unresolved current-workbook download preserves unresolved source
      values.
- [x] Other seller-owned columns and worksheets retain their verified values.
- [x] Workbook-fidelity limitations are stated accurately.
- [x] Download failures are reported separately and can be retried without
      upload, remapping, or rematching.

Evidence to record:

- Test command and result: `pnpm main test -- catalog-importer.test.ts
catalog-importer-file.test.ts catalog-importer-workbench.test.tsx` — 25
  passed; `BASE_URL=http://localhost:3017 pnpm playwright test
tests/e2e/catalog-importer.e2e.ts` — 3 passed; typecheck passed.
- Lint result: zero errors; one pre-existing dashboard `useEffect` dependency
  warning outside importer scope.
- Workbooks checked: `2023 LIST ALPHABETICAL.xlsx` (568 rows),
  `VarietyPedigrees.xlsx` (559 rows), and `Daylilies info.xlsx` (three sheets;
  1,087 rows on the selected sheet).
- Downloaded file path:
  `/Users/makon/Downloads/daylilies-info-daylily-catalog (4).xlsx`
- Visible Chrome result: restored real draft, 1,034 of 1,086 listings linked,
  download completed without a page error.
- Spreadsheet-open result: artifact spreadsheet import and three-sheet value
  comparison passed; LibreOffice opened and resaved the exact Chrome download,
  and the resaved file reopened with three expected sheets and ranges.
- Commit: this Slice 0 commit.

### Slice 1 — Make importer state, provenance, and counts explicit

**Outcome:** Every surface reads from one understandable state model, and
summary counts cannot silently conflate rows, listings, and cultivars.

Use the smallest state vocabulary that supports current requirements:

- `rowKind`: listing or ignored;
- `outputState`: included or removed;
- `linkState`: pending, linked, or intentionally unmatched; and
- `linkProvenance`: saved ID, exact name, automatic name, or user confirmed.

Tasks:

- [x] Audit existing row status fields and remove overlapping concepts.
- [x] Add or rename only fields needed to represent the vocabulary above.
- [x] Keep invalid saved IDs out of the ordinary matching queue until their
      identity issue is resolved.
- [x] Preserve valid saved-ID matches without rematching by name.
- [x] Create pure selectors for:
  - [x] source rows;
  - [x] detected listings;
  - [x] included listings;
  - [x] linked listings;
  - [x] pending cultivar decisions;
  - [x] intentionally unmatched listings;
  - [x] linked unique cultivars;
  - [x] duplicate groups;
  - [x] required data decisions;
  - [x] warnings; and
  - [x] enrichment metrics.
- [x] Version and migrate the browser-local draft if its persisted shape
      changes.
- [x] Verify restoration after refresh and fresh client navigation.
- [x] Remove state synchronization that can be derived from events/selectors.
- [x] Add focused state-transition and restoration integration coverage.

Acceptance:

- [x] The same selector supplies each count everywhere it appears.
- [x] Source rows, listings, linked listings, and unique cultivars have
      separate labels and values.
- [x] Existing drafts restore without losing workbook bytes or review progress.
- [x] No new synchronization `useEffect` is introduced.

Evidence:

- `pnpm main test -- catalog-importer.test.ts
catalog-importer-draft.test.ts catalog-importer-client.test.tsx
catalog-importer-workbench.test.tsx catalog-importer-preview.test.ts
catalog-importer-file.test.ts` — 33 passed.
- `BASE_URL=http://localhost:3017 pnpm playwright test
tests/e2e/catalog-importer.e2e.ts` — 3 passed.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome reload migrated and restored `Daylilies info.xlsx`: 1,087
  source rows, 1,086 detected listings, 1,034 linked listings, 52 review
  decisions, and no spreadsheet issues.

## Phase B — Reveal and explore

### Slice 2 — Refine upload, mapping, persistence, and processing feedback

**Outcome:** A seller understands the result before uploading and sees honest,
recoverable progress after submitting column mapping.

Tasks:

- [x] Use the heading `Turn your daylily spreadsheet into a catalog-ready collection`.
- [x] Keep upload copy concise while explaining XLSX/CSV support.
- [x] Show the three primary privacy promises:
  - [x] processed in the browser;
  - [x] complete workbook not saved to the application database; and
  - [x] nothing published.
- [x] Keep longer technical detail expandable.
- [x] Persist the workbook and mapping before matching begins.
- [x] Retain the explicit submit step after column selection.
- [x] Show real processing stages:
  - [x] reading workbook;
  - [x] detecting listing rows;
  - [x] matching cultivar names;
  - [x] loading reference data and photographs; and
  - [x] building the private preview.
- [x] Use no fake delays.
- [x] Retry matching without another upload or remap.
- [x] Keep download errors out of matching-error UI.
- [x] Rename ambiguous file actions to their exact scope:
  - [x] Map columns;
  - [x] Reset column mapping;
  - [x] Start over with this file; and
  - [x] Clear local progress.
- [x] Show `Saved locally in this browser on this device`.
- [x] Confirm destructive clearing and explain that the original file is
      unaffected.

Acceptance:

- [x] Refresh or client navigation can restore a fresh draft.
- [x] Matching failure leaves the workbook and mapping immediately retryable.
- [x] Processing feedback reflects actual work.
- [x] The page does not imply upload, publishing, or database persistence.

Evidence:

- `pnpm main test -- catalog-importer.test.ts
catalog-importer-draft.test.ts catalog-importer-client.test.tsx
catalog-importer-page.test.tsx catalog-importer-workbench.test.tsx
catalog-importer-preview.test.ts catalog-importer-file.test.ts` — 36 passed.
- `BASE_URL=http://localhost:3017 pnpm playwright test
tests/e2e/catalog-importer.e2e.ts` — 3 passed.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome restored `Daylilies info.xlsx` with 1,034 links and 52 review
  decisions, showed the new privacy/file controls, opened mapping without
  losing progress, and verified the clear-local-progress confirmation without
  clearing the draft.

### Slice 3 — Build the personalized results reveal and workspace order

**Outcome:** Results lead with what cultivar identity unlocked, not with a
generic status panel or a list of errors.

Workspace order:

1. Results reveal.
2. Catalog preview.
3. Collection insights.
4. Preparation status.
5. Cultivar review.
6. Spreadsheet issues.
7. Download.
8. Pro continuation.

Tasks:

- [x] Replace generic result status with `Your private catalog preview is ready`.
- [x] Show precise counts for source rows, detected listings, linked listings,
      linked unique cultivars, and pending decisions.
- [x] Add personalized enrichment metrics such as reference photos, awards,
      searchable attributes, hybridizers, and registration-year span.
- [x] Explain seller data versus Daylily Catalog reference data once near the
      reveal.
- [x] State `Private browser preview · Nothing has been published`.
- [x] Connect unresolved counts to the visible consequence: those listings are
      not yet enriched or included in preview/insights.
- [x] Add `Explore your catalog` and the correct next-repair action.
- [x] Remove redundant Matches and decorative summary-card sections.
- [x] Move the large membership interruption out of the preview-to-insights
      flow.
- [x] Keep layout hierarchy with headings, dividers, spacing, and typography
      rather than card wrappers.

Acceptance:

- [x] A seller can explain within seconds what matching added.
- [x] Every number has a precise counting basis.
- [x] Preview and insights read as one continuous value demonstration.

Evidence (2026-07-18):

- 37 focused importer tests passed.
- All 3 importer E2Es passed, including restoration, repair/download, sample,
  and mobile-overflow coverage.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome rebuilt the 1,087-row workbook and showed 1,034 linked
  listings, 1,034 linked unique cultivars, 1,017 listings with reference
  photos, 84 award-winning cultivars, 18 searchable attribute types, 250
  hybridizers, registration years 1956–2023, and 52 pending decisions.

### Slice 4 — Make catalog preview trusted and useful

**Outcome:** The preview is a credible model of the seller's catalog, without
exposing unresolved identities as facts.

Tasks:

- [x] Include only confident automatic links, valid saved-ID links, and
      seller-confirmed links.
- [x] Exclude uncertain candidate matches until the seller confirms one.
- [x] Remove confidence percentages from customer-facing listing cards.
- [x] Add `Catalog view | Data review` only if review controls cannot remain
      clear in a simple details surface.
- [x] In customer view, hide source rows, confidence, and internal diagnostics.
- [x] Keep source-row context in the revision sheet and allow `Change match`.
- [x] Prioritize seller-mapped price, description, private note, and image over
      registry fallbacks.
- [x] Label seller and reference photographs distinctly where ambiguity is
      possible.
- [x] Keep all matched images on the shared optimized asset path with square
      thumbnails, display-size previews, and blur-up.
- [x] Add the unresolved-listings callout with a direct review action.
- [x] When a match is confirmed:
  - [x] insert the listing into preview;
  - [x] update filters and insights;
  - [x] announce the addition;
  - [x] offer `View in preview`; and
  - [x] offer Undo.
- [x] Keep the bounded three-card-tall scroll area, in-scroll Show more,
      persistent `Showing X of X`, and nonoverlapping Return to top.
- [x] Keep shared basic and advanced catalog filters.

Acceptance:

- [x] No unresolved candidate receives a reference image or cultivar facts.
- [x] Seller data wins over reference fallbacks where intended.
- [x] Card controls do not overlap content at desktop or mobile widths.
- [x] Confirming a match produces a visible reward in preview.

Implementation note:

- A separate Catalog/Data mode was not added. Customer-facing cards remain
  clean, while the single link icon opens the existing source-row and candidate
  sheet when revision is needed.

Evidence (2026-07-18):

- 38 focused importer tests passed, including explicit rejection of a pending
  row that still carries candidate data and confirmation/undo coverage.
- All 3 importer E2Es passed with customer-card, reference-photo,
  confirmation/undo, restoration, download, and mobile-overflow assertions.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome showed zero confidence badges, 20 labeled reference photos in
  the loaded preview, the 52-listing unresolved callout, and the full source-row
  match sheet opened from the new link action.

### Slice 5 — Make collection insights accurate and interactive

**Outcome:** Insights provide personalized discoveries and lead directly back
to the matching catalog results.

Tasks:

- [x] Base cultivar facts on linked unique cultivar IDs, not listing rows.
- [x] State the basis and excluded unresolved count.
- [x] Prioritize high-salience discoveries:
  - [x] top hybridizers;
  - [x] registration-year span or decades;
  - [x] award-winning cultivars;
  - [x] ploidy;
  - [x] bloom season;
  - [x] flower form; and
  - [x] reference-photo coverage.
- [x] Use narrative metrics when a chart would contain mostly values of one.
- [x] Make each useful insight apply the existing preview filter.
- [x] Preserve compatible active filters and show a removable filter summary.
- [x] Move the seller back to preview after applying an insight.
- [x] Recompute insights after match confirmation, change, undo, or exclusion.
- [x] Lift only the controlled filter state required to connect insights and
      preview; do not add a generic workspace context.

Acceptance:

- [x] Duplicate listings do not inflate unique-cultivar facts.
- [x] Every interactive insight produces the expected preview result.
- [x] Small catalogs still receive useful prose instead of empty charts.

Evidence (2026-07-18):

- 38 focused importer tests passed, including duplicate-safe analysis,
  controlled insight filtering, filter-chip removal, and confirmation/undo
  recomputation.
- All 3 importer E2Es passed, including the phone-width overflow check.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome showed the real workbook basis as 1,034 linked unique
  cultivars with 52 unresolved listings excluded, 1,017 reference photos, 84
  award winners, years 1956–2023, and a top-hybridizer ranking. Selecting
  Stamile applied the shared removable filter and reduced the preview from
  1,034 to 52 listings.

### Slice 6 — Add persistent workspace status and navigation

**Outcome:** The seller can see remaining work and reach the next action from
anywhere without the page becoming a rigid wizard.

Tasks:

- [x] Add a compact sticky desktop bar with:
  - [x] Catalog preview;
  - [x] Insights;
  - [x] Review names with count;
  - [x] Fix data with count; and
  - [x] Download current/prepared workbook.
- [x] Use a compact mobile bottom bar with remaining-work count and download.
- [x] Choose the next task in this order:
  1. identity decision;
  2. required value;
  3. warning.
- [x] Scroll/focus the destination without covering its heading or controls.
- [x] Keep download available while work remains.
- [x] Ensure sticky controls never cover validation, content, or issue actions.

Acceptance:

- [x] Remaining work is visible while exploring preview and insights.
- [x] `Review next` always reaches the correct unresolved item.
- [x] Mobile has no competing sticky controls.

Evidence (2026-07-18):

- 38 focused importer tests passed, including workspace links, counts,
  persistent download, and live count changes after confirm/undo.
- All 3 importer E2Es passed; the phone scenario verifies the mobile bar,
  hidden desktop/Return-to-top controls, and zero page-level overflow.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome with the real workbook verified the desktop bar at the
  preview and insights positions, clear anchor offsets, no preview controls
  leaking into insights, Review names (52), and current-workbook download.

## Phase C — Repair

### Slice 7 — Complete cultivar review, revision, and undo

**Outcome:** Uncertain cultivar identity is a focused, understandable decision
workflow, and every link can be corrected later.

Tasks:

- [x] Keep the one-at-a-time review model.
- [x] Show all seller spreadsheet columns for the active source row.
- [x] For each close candidate show:
  - [x] reference photograph;
  - [x] cultivar name;
  - [x] hybridizer and year;
  - [x] why it was suggested;
  - [x] distinguishing registry details; and
  - [x] explicit `Link this listing to …` action.
- [x] Keep number-key selection as a secondary shortcut.
- [x] Keep `X` as the Decide later shortcut within the match choices.
- [x] Separate `Decide later` from `Leave unmatched`.
- [x] Explain the prepared-workbook consequence of leaving a row unmatched.
- [x] Keep Other match search below close matches.
- [x] Give Other match search its own independent results and reset-to-source
      query action.
- [x] Keep close and search result areas to three visible cards with internal
      vertical scrolling.
- [x] Keep two-column image/details candidate cards on mobile.
- [x] Allow previous/next navigation, reopening automatic links, changing
      manual links, and restoring an intentionally unmatched row.
- [x] Add a direct one-level Undo for the latest identity decision.
- [x] Do not add a generic command-history system.

Acceptance:

- [x] Every pending row can be linked, deferred, or intentionally unmatched.
- [x] Every link can be revised.
- [x] Refresh restores queue contents, position, and completed decisions.
- [x] Keyboard use supplements rather than replaces visible actions.

Evidence (2026-07-18):

- 38 focused importer tests passed, including defer-versus-unmatched behavior,
  explicit candidate actions, restoration, linked-row unlinking, and undo.
- All 3 importer E2Es passed with keyboard defer, intentional unmatched output,
  refresh restoration, download, and phone-width coverage.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome verified the 52-row real review queue, all uploaded columns,
  the two-column candidate layout, X defer/arrow navigation, intentional
  unmatched state, restoration, and one-level Undo back to 1 of 52.

### Slice 8 — Complete spreadsheet issue repair

**Outcome:** Issues are grouped by meaning, all relevant rows are visible
together, and each action states exactly what it changes in the prepared file.

Issue levels:

- **Needs a decision:** identity cannot be established safely.
- **Needs a value:** required structured output needs seller input.
- **Warning:** data may be intentional but deserves inspection.

Tasks:

- [x] Keep identity decisions in Slice 7's separate focused workflow.
- [x] Show all rows for each spreadsheet issue group rather than one issue at a
      time.
- [x] Price-format review:
  - [x] show original value;
  - [x] offer a suggested numeric unit price where safely parsed;
  - [x] preserve bundle meaning in a note or original seller field;
  - [x] use an icon-only row Save with an accessible name;
  - [x] provide Save all for valid edited rows;
  - [x] allow leaving the value unresolved; and
  - [x] avoid calling valid seller offers intrinsically invalid.
- [x] Keep a deliberately bounded parser for obvious formats such as
      `2 for $30`; do not build a pricing language.
- [x] Possible duplicate review:
  - [x] show related rows in one table;
  - [x] default to the possibility that both listings are intentional;
  - [x] offer Keep both listings;
  - [x] offer `Remove row X from prepared workbook`;
  - [x] state that the uploaded source file remains untouched; and
  - [x] support Undo.
- [x] Seller-image review distinguishes malformed URLs, successful previews,
      and an unknown browser preview failure. The browser does not reliably
      expose whether an image failure was a timeout, remote rejection,
      hotlink restriction, or unsupported format, so those causes are not
      asserted as facts.
- [x] Say `We could not preview this seller image from your browser` when the
      failure reason is not knowable.
- [x] Allow a linked reference photograph to remain in preview while clearly
      retaining the seller-image warning.
- [x] Invalid saved-ID review:
  - [x] try a new confident name match;
  - [x] explain an automatic replacement;
  - [x] require identity review when uncertain; and
  - [x] never export an invalid ID as resolved identity.
- [x] Add an unresolved path and undo for every issue action.

Acceptance:

- [x] Every supported issue explains what was found, why it matters, what the
      action changes, and whether it may remain unresolved.
- [x] Batch price saving cannot silently overwrite an invalid edit.
- [x] Intentional same-cultivar listings can both remain.
- [x] Image failures are not overdiagnosed.

Evidence (2026-07-18):

- 39 focused importer tests passed, including stale-ID recovery through a
  successful confident name rematch.
- All 3 importer E2Es passed with grouped price, duplicate, and image repair;
  one-level issue Undo; preserved bundle-price notes; download; restoration;
  and phone-width coverage.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- The visible real-workbook Chrome draft remained intact at 1,086 detected
  listings, 1,034 linked listings, and 52 separate identity decisions. The
  synthetic issue path was exercised in the browser E2E so the real draft did
  not need to be replaced.

## Phase D — Export and continue

### Slice 9 — Complete the prepared-workbook download experience

**Outcome:** Download is a clear, retryable product result whose contents match
the verified cleaned-workbook contract.

Tasks:

- [x] Use `Download current workbook` while decisions remain.
- [x] Use `Download prepared workbook` when all required decisions are done.
- [x] Before generation, summarize:
  - [x] retained worksheet count;
  - [x] retained source-row count;
  - [x] applied seller-approved corrections;
  - [x] linked identity count;
  - [x] intentionally unmatched count;
  - [x] removed-row count;
  - [x] unresolved values/warnings; and
  - [x] workbook features not preserved.
- [x] Explain that live reference photographs, awards, and cultivar attributes
      remain linked to Daylily Catalog and are not copied into the workbook.
- [x] Use the stable filename
      `original-name-daylily-catalog-prepared.xlsx`.
- [x] Keep CSV input/output behavior explicit.
- [x] Ensure download generation cannot mutate the current in-browser project.
- [x] Separate download failure state and retry from matching.
- [x] Prove the output can be re-uploaded with identity fields recognized
      automatically.
- [x] Verify all three samples and the real 1,087-row, three-sheet workbook.

Acceptance:

- [x] Current and completed download labels reflect actual state.
- [x] The pre-download summary matches the generated file.
- [x] A failed download can be retried without rematching.
- [x] The prepared file is an unambiguous future-import contract.

Evidence (2026-07-18):

- 39 focused importer tests passed, including source-workbook immutability and
  automatic recognition of the prepared identity columns on re-upload.
- All 3 importer E2Es passed with current/prepared labels, exact summary
  counts, stable CSV filename, generated-file content checks, retry behavior,
  restoration, and phone-width coverage.
- Typecheck passed. Lint has zero errors and one unrelated existing dashboard
  warning.
- Visible Chrome showed the real workbook summary: 3 worksheets, 1,302 total
  source rows, 1,034 linked identities, and 52 unresolved cultivar decisions.
- Chrome downloaded
  `/Users/makon/Downloads/daylilies-info-daylily-catalog-prepared.xlsx`.
  It reopened as 3 sheets with row counts 1,087, 153, and 62; the two untouched
  sheets were value-identical to the source, and the selected sheet gained
  only the three Daylily Catalog identity columns.
- The three supplied workbook formats remain covered by the Slice 0 contract
  proof; this slice did not change workbook reconstruction, only its summary,
  filename, and download presentation.

### Slice 10 — Add honest guest/member continuation

**Outcome:** Nonmembers receive the complete prepared workbook; Pro prompts
sell current hosted-catalog capabilities without interrupting preparation.

Tasks:

- [ ] Keep review, repair, and download capabilities equal for guests and
      members in this flow.
- [ ] Add a quiet nonblocking prompt after preview and insights.
- [ ] Add the strongest prompt after completion or download.
- [ ] Frequency-cap or dismiss repeated prompts.
- [ ] Do not show membership acquisition to existing Pro members.
- [ ] Describe current Pro capabilities accurately:
  - [ ] seller dashboard;
  - [ ] hosted public catalog;
  - [ ] ongoing catalog management; and
  - [ ] Daylily Catalog discovery.
- [ ] Do not imply that this workbook can currently be imported or published
      in one click.
- [ ] Preserve the browser-local project through sign-in and return.
- [ ] Keep audience messaging outside the matching, issue, preview, and export
      engines.
- [ ] Reuse existing membership link tracking rather than adding a new funnel
      abstraction.

Acceptance:

- [ ] No prompt blocks repair or download.
- [ ] A guest can download all completed work.
- [ ] Authentication return restores the same local project.
- [ ] Pro copy promises only shipping capabilities.

## Phase E — Hardening and closeout

### Slice 11 — Fix mobile and accessibility blockers

**Outcome:** The full workspace works at narrow widths and for keyboard and
assistive-technology users without a separate mobile product.

Tasks:

- [ ] Verify no page-level horizontal overflow.
- [ ] Convert only genuinely unusable wide source/issue tables to labeled
      mobile row layouts.
- [ ] Keep match choices image/details side by side where requested.
- [ ] Verify no clipped issue-resolution controls.
- [ ] Verify no sticky or floating control covers content.
- [ ] Add accessible names to icon-only actions.
- [ ] Verify readable contrast, focus visibility, and touch target size.
- [ ] Announce match confirmation, issue resolution, and undo in a live region.
- [ ] Keep keyboard shortcuts optional and suppress them while typing.
- [ ] Respect reduced motion for automatic scroll and card insertion.
- [ ] Verify useful cultivar/reference-image alternative text.
- [ ] Verify table headers and source-row associations.

Acceptance:

- [ ] Desktop, tablet, and narrow mobile complete the happy path.
- [ ] Keyboard-only completion is possible without memorized shortcuts.
- [ ] Status meaning is not communicated by color alone.

### Slice 12 — Verify large-workbook performance and add only proven scaling controls

**Outcome:** Production-shaped workbooks remain usable, with no speculative
virtualization or pagination complexity.

Tasks:

- [ ] Measure the real 1,087-row, three-sheet workbook.
- [ ] Measure a synthetic 5,000-listing workbook only after the real case.
- [ ] Record time and responsiveness for:
  - [ ] parsing;
  - [ ] persistence;
  - [ ] matching;
  - [ ] first meaningful preview;
  - [ ] filtering;
  - [ ] insight calculation;
  - [ ] issue grouping;
  - [ ] restoration; and
  - [ ] download generation.
- [ ] Keep work incremental where the existing event model supports it.
- [ ] Add pagination, virtualization, or a large-queue table mode only when a
      recorded measurement demonstrates the need.
- [ ] Keep review and download controls responsive while background work runs.

Acceptance:

- [ ] The real workbook completes matching, restoration, review, and download
      within recorded usable bounds.
- [ ] Any new scaling mechanism has an evidence-backed threshold.
- [ ] No feature is added solely for hypothetical scale.

### Slice 13 — Complete analytics, Atlas, documentation, and real-workbook proof

**Outcome:** The feature has high-signal product measurement, reproducible
visual states, accurate documentation, and end-to-end evidence.

Tasks:

- [ ] Keep analytics minimal and aggregate-only:
  - [ ] upload started/completed;
  - [ ] first meaningful preview;
  - [ ] preview search/filter or insight interaction;
  - [ ] first and final identity decision;
  - [ ] issue resolution;
  - [ ] current-workbook download;
  - [ ] prepared-workbook download;
  - [ ] membership prompt impression/dismissal/click.
- [ ] Never send filenames, cultivar names, spreadsheet cells, private notes,
      or seller content.
- [ ] Update Atlas to cover meaningful states without duplicating exhaustive
      shared-search tests.
- [ ] Keep one focused E2E happy path for upload, mapping, submit/processing,
      reveal, representative review, issue repair, download, restoration, and
      mobile overflow.
- [ ] Re-run existing public catalog and cultivar flows after shared-search
      component changes.
- [ ] Update:
  - [ ] `catalog-list-cleaner.md`;
  - [ ] `agent-development-flywheel.md` if the declared flow changes;
  - [ ] Atlas state descriptions; and
  - [ ] relevant AGENTS.md reusable knowledge only when genuinely learned.
- [ ] Complete visible Chrome proof using all three supplied samples.
- [ ] Complete visible Chrome proof using the real 1,087-row, three-sheet file.
- [ ] Verify:
  - [ ] restoration after refresh and client navigation;
  - [ ] matching retry;
  - [ ] download retry;
  - [ ] re-upload of the prepared workbook;
  - [ ] opened downloaded workbook;
  - [ ] desktop and mobile layouts; and
  - [ ] zero relevant Next.js dev issues.

Acceptance:

- [ ] Analytics prove the core funnel without collecting seller data.
- [ ] Atlas and E2E cover different, high-value responsibilities.
- [ ] Documentation matches the shipped UI and workbook behavior.
- [ ] Real-workbook proof is recorded in the work log.

## Quality gates

Run proportionate checks after each slice, then all gates before completion.

- [ ] Focused unit/integration tests pass.
- [ ] Importer E2E happy path passes.
- [ ] Existing shared public-catalog/cultivar checks pass after shared changes.
- [ ] Typecheck passes.
- [ ] Lint has no new errors or warnings.
- [ ] Formatting check passes.
- [ ] Relevant Atlas desktop and mobile states are inspected.
- [ ] Visible Chrome happy path passes.
- [ ] Browser console and Next.js development issues have no relevant errors.
- [ ] Dirty worktree contains no unexplained files.
- [ ] Each completed slice is committed and pushed to PR #352.

## Final exit gates

The goal is complete only when:

- [ ] every phase and slice is checked;
- [ ] all acceptance criteria are met or explicitly superseded in the decision
      log;
- [ ] all quality gates pass;
- [ ] the real 1,087-row, three-sheet contract proof passes;
- [ ] the prepared workbook opens and re-uploads correctly;
- [ ] browser-local restoration survives refresh, client navigation, and
      sign-in return where applicable;
- [ ] nothing is published and no database listings are created;
- [ ] the user receives a final summary of behavior, evidence, remaining
      non-goals, and PR state.

## Explicit non-goals

- Creating database listings.
- Publishing a catalog.
- Building the future dashboard importer.
- Adding an open-ended AI chat surface.
- Sending or storing complete workbooks on the server.
- Paywalling repair or download in this version.
- Reimplementing search or filter semantics.
- Creating a rigid wizard.
- Creating a generic workflow or undo framework.
- Adding speculative metadata sheets or import fields.
- Adding new state-synchronization `useEffect` logic.
- Running automatic or nested Codex reviews.

## Risks and open decisions

| Status           | Question or risk                                                                                       | Resolution path                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolved         | Which XLSX features does the current reconstruction actually preserve?                                 | It reconstructs browser-readable cell values and sheets; formulas, formatting, comments, merges, drawings, validation, and hidden state are not retained. |
| Resolved         | Should an approved bundle price write only numeric unit price or also populate an existing note field? | Write the approved numeric unit price and append the exact original offer to a mapped private-note field; otherwise leave it unresolved.                  |
| Resolved         | Is a Catalog view/Data review toggle necessary?                                                        | No. Customer-facing cards stay clean; one link action opens the existing source-row and match-revision sheet.                                             |
| Resolved         | Which insights are useful for very small catalogs?                                                     | Rank available facts and prefer concise narrative metrics over empty or low-information charts.                                                           |
| Open in Slice 10 | What exact sign-in return URL preserves the local project?                                             | Reuse the existing auth return pattern and verify IndexedDB remains available on the same origin.                                                         |
| Open in Slice 12 | Does the preview need virtualization?                                                                  | Add it only if real measurements show the existing bounded rendering is not responsive.                                                                   |

## Work log

Add new entries at the top. Keep descriptions factual and link commits or
artifacts when useful.

| Date       | Slice    | Status   | What changed                                                                                                                                            | Verification                                                                                                                                                              | Commit / notes                      |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 2026-07-18 | Slice 9  | Complete | Added exact pre-download summary, current/prepared labels, stable prepared filenames, explicit output/fidelity copy, and deterministic re-upload proof. | 39 focused tests, 3 importer E2Es, typecheck, lint with one unrelated warning, visible Chrome summary, and reopened three-sheet real-workbook output.                     | This Slice 9 commit.                |
| 2026-07-18 | Slice 8  | Complete | Grouped issue repair; preserved bundle-price meaning; clarified duplicate/image consequences; added stale-ID rematching and issue Undo.                 | 39 focused tests, 3 importer E2Es, typecheck, lint with one unrelated warning, plus preserved visible real-workbook state in Chrome.                                      | `cb47bb01`                          |
| 2026-07-18 | Slice 7  | Complete | Separated defer and intentional-unmatched decisions; added explicit candidate actions, restoration, linked-row unlinking, and identity Undo.            | 38 focused tests, 3 importer E2Es, typecheck, lint with one unrelated warning, and visible Chrome verification against the real 52-row review queue.                      | `10e70ca7`                          |
| 2026-07-18 | Slice 6  | Complete | Added responsive persistent workspace navigation, prioritized next-task links, and always-available current/prepared download without duplicate state.  | 38 focused tests, 3 importer E2Es, typecheck, lint with one unrelated warning, and real Chrome verification of sticky anchors and the 1,087-row workflow.                 | `086da3d8`                          |
| 2026-07-18 | Slice 5  | Complete | Counted linked unique cultivars; added narrative discoveries and clickable rankings that drive the shared removable preview filters.                    | 38 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, and real Chrome filtering of the 1,087-row catalog from 1,034 to 52 listings.     | `dd181675`                          |
| 2026-07-18 | Slice 4  | Complete | Restricted preview to explicit links; removed confidence badges; labeled image provenance; added match confirmation, highlighting, revision, and undo.  | 38 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, and visible Chrome verification against the 1,087-row preview.                    | `b1442747`                          |
| 2026-07-18 | Slice 3  | Complete | Replaced the generic overview with a personalized enrichment reveal; reordered preview, insights, preparation, repair, download, and Pro continuation.  | 37 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, and visible Chrome verification with the rebuilt 1,087-row workbook.              | `1d999a90`                          |
| 2026-07-18 | Slice 2  | Complete | Clarified browser-local privacy and file actions; added confirmed resets and event-driven processing stages without timed delays or effects.            | 36 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, and visible Chrome verification with the restored real workbook.                  | `bda585ad`                          |
| 2026-07-18 | Slice 1  | Complete | Replaced overlapping row flags with explicit row/output/link/provenance state; centralized counts and enrichment; migrated v2 browser drafts to v3.     | 33 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, and visible Chrome restoration of the 1,087-row workbook.                         | `01e838c0`                          |
| 2026-07-18 | Slice 0  | Complete | Implemented cleaned mapped fields and canonical identity headers; documented the verified XLSX value-copy contract.                                     | 25 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, real Chrome download, full three-sheet value comparison, LibreOffice open/resave. | `1d643703`                          |
| 2026-07-18 | Planning | Complete | Converted the full UI/UX review into a 14-slice implementation tracker; made cleaned-copy semantics the first gated contract.                           | Plan reviewed against the current product doc and PR boundary.                                                                                                            | Implementation begins with Slice 0. |

## Deferred follow-ups

Record worthwhile ideas that are intentionally outside this goal. Do not pull
them into an active slice without updating the product contract and receiving
user direction.

- Future dashboard/database import using validated `Daylily Catalog ID`.
- Onboarding integration or public acquisition limits.
- Server-side workbook storage or cross-device project sync.
- Structured bundle-pricing data model.
- Seller listing creation from the preview.
- Broader cross-browser performance benchmarks.
