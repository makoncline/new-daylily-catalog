# Catalog Importer Implementation Plan

This is the working tracker for completing the catalog importer as a
Pro-grade spreadsheet-preparation workspace. It is intentionally operational:
the active goal agent should update this file while working, and the user
should be able to open the first sections at any time to understand progress,
decisions, evidence, and blockers.

## Live status

| Field           | Current value                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Overall status  | Implementation in progress                                                                                              |
| Current phase   | Phase A — Contract and state foundation                                                                                 |
| Current slice   | Slice 1 — Make importer state, provenance, and counts explicit                                                          |
| Last updated    | 2026-07-18                                                                                                              |
| Branch          | `agent/catalog-importer-v1`                                                                                             |
| Baseline commit | `7b5a81ad`                                                                                                              |
| Pull request    | [#352 — Prepare daylily catalog spreadsheets](https://github.com/makoncline/new-daylily-catalog/pull/352)               |
| Current blocker | None                                                                                                                    |
| Next action     | Audit overlapping row status fields and count ownership for Slice 1                                                     |
| Latest evidence | Slice 0 passed 25 focused tests, 3 E2Es, typecheck, real Chrome download, value comparison, and LibreOffice open/resave |

### Progress

- [ ] Phase A — Contract and state foundation
  - [x] Slice 0 — Verify and freeze the cleaned-workbook contract
  - [ ] Slice 1 — Make importer state, provenance, and counts explicit
- [ ] Phase B — Reveal and explore
  - [ ] Slice 2 — Refine upload, mapping, persistence, and processing feedback
  - [ ] Slice 3 — Build the personalized results reveal and workspace order
  - [ ] Slice 4 — Make catalog preview trusted and useful
  - [ ] Slice 5 — Make collection insights accurate and interactive
  - [ ] Slice 6 — Add persistent workspace status and navigation
- [ ] Phase C — Repair
  - [ ] Slice 7 — Complete cultivar review, revision, and undo
  - [ ] Slice 8 — Complete spreadsheet issue repair
- [ ] Phase D — Export and continue
  - [ ] Slice 9 — Complete the prepared-workbook download experience
  - [ ] Slice 10 — Add honest guest/member continuation
- [ ] Phase E — Hardening and closeout
  - [ ] Slice 11 — Fix mobile and accessibility blockers
  - [ ] Slice 12 — Verify large-workbook performance and add only proven scaling controls
  - [ ] Slice 13 — Complete analytics, Atlas, documentation, and real-workbook proof

### Current-slice notes

Use this area for short-lived details needed to resume the active slice.
Move durable decisions to the decision log and completed work to the work log.

- Slice 0 is complete and awaiting its commit/push.
- Begin Slice 1 by inventorying existing `matchStatus`, `skipped`, `removed`,
  warning, duplicate, and provenance logic before renaming any state.
- Prefer pure selectors over storing additional counts or flags.
- Preserve the newly frozen cleaned-workbook contract.

### User update

Use this as the source for concise progress updates.

> Slice 0 is complete: the cleaned-copy contract is implemented, documented,
> and verified with the real 1,087-row workbook from visible Chrome. The next
> slice will simplify row state and make every summary count come from shared
> pure selectors.

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

- [ ] Audit existing row status fields and remove overlapping concepts.
- [ ] Add or rename only fields needed to represent the vocabulary above.
- [ ] Keep invalid saved IDs out of the ordinary matching queue until their
      identity issue is resolved.
- [ ] Preserve valid saved-ID matches without rematching by name.
- [ ] Create pure selectors for:
  - [ ] source rows;
  - [ ] detected listings;
  - [ ] included listings;
  - [ ] linked listings;
  - [ ] pending cultivar decisions;
  - [ ] intentionally unmatched listings;
  - [ ] linked unique cultivars;
  - [ ] duplicate groups;
  - [ ] required data decisions;
  - [ ] warnings; and
  - [ ] enrichment metrics.
- [ ] Version and migrate the browser-local draft if its persisted shape
      changes.
- [ ] Verify restoration after refresh and fresh client navigation.
- [ ] Remove state synchronization that can be derived from events/selectors.
- [ ] Add focused state-transition and restoration integration coverage.

Acceptance:

- [ ] The same selector supplies each count everywhere it appears.
- [ ] Source rows, listings, linked listings, and unique cultivars have
      separate labels and values.
- [ ] Existing drafts restore without losing workbook bytes or review progress.
- [ ] No new synchronization `useEffect` is introduced.

## Phase B — Reveal and explore

### Slice 2 — Refine upload, mapping, persistence, and processing feedback

**Outcome:** A seller understands the result before uploading and sees honest,
recoverable progress after submitting column mapping.

Tasks:

- [ ] Use the heading `Turn your daylily spreadsheet into a catalog-ready collection`.
- [ ] Keep upload copy concise while explaining XLSX/CSV support.
- [ ] Show the three primary privacy promises:
  - [ ] processed in the browser;
  - [ ] complete workbook not saved to the application database; and
  - [ ] nothing published.
- [ ] Keep longer technical detail expandable.
- [ ] Persist the workbook and mapping before matching begins.
- [ ] Retain the explicit submit step after column selection.
- [ ] Show real processing stages:
  - [ ] reading workbook;
  - [ ] detecting listing rows;
  - [ ] matching cultivar names;
  - [ ] loading reference data and photographs; and
  - [ ] building the private preview.
- [ ] Use no fake delays.
- [ ] Retry matching without another upload or remap.
- [ ] Keep download errors out of matching-error UI.
- [ ] Rename ambiguous file actions to their exact scope:
  - [ ] Map columns;
  - [ ] Reset column mapping;
  - [ ] Start over with this file; and
  - [ ] Clear local progress.
- [ ] Show `Saved locally in this browser on this device`.
- [ ] Confirm destructive clearing and explain that the original file is
      unaffected.

Acceptance:

- [ ] Refresh or client navigation can restore a fresh draft.
- [ ] Matching failure leaves the workbook and mapping immediately retryable.
- [ ] Processing feedback reflects actual work.
- [ ] The page does not imply upload, publishing, or database persistence.

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

- [ ] Replace generic result status with `Your private catalog preview is ready`.
- [ ] Show precise counts for source rows, detected listings, linked listings,
      linked unique cultivars, and pending decisions.
- [ ] Add personalized enrichment metrics such as reference photos, awards,
      searchable attributes, hybridizers, and registration-year span.
- [ ] Explain seller data versus Daylily Catalog reference data once near the
      reveal.
- [ ] State `Private browser preview · Nothing has been published`.
- [ ] Connect unresolved counts to the visible consequence: those listings are
      not yet enriched or included in preview/insights.
- [ ] Add `Explore your catalog` and the correct next-repair action.
- [ ] Remove redundant Matches and decorative summary-card sections.
- [ ] Move the large membership interruption out of the preview-to-insights
      flow.
- [ ] Keep layout hierarchy with headings, dividers, spacing, and typography
      rather than card wrappers.

Acceptance:

- [ ] A seller can explain within seconds what matching added.
- [ ] Every number has a precise counting basis.
- [ ] Preview and insights read as one continuous value demonstration.

### Slice 4 — Make catalog preview trusted and useful

**Outcome:** The preview is a credible model of the seller's catalog, without
exposing unresolved identities as facts.

Tasks:

- [ ] Include only confident automatic links, valid saved-ID links, and
      seller-confirmed links.
- [ ] Exclude uncertain candidate matches until the seller confirms one.
- [ ] Remove confidence percentages from customer-facing listing cards.
- [ ] Add `Catalog view | Data review` only if review controls cannot remain
      clear in a simple details surface.
- [ ] In customer view, hide source rows, confidence, and internal diagnostics.
- [ ] In data review, show provenance and allow `Change match`.
- [ ] Prioritize seller-mapped price, description, private note, and image over
      registry fallbacks.
- [ ] Label seller and reference photographs distinctly where ambiguity is
      possible.
- [ ] Keep all matched images on the shared optimized asset path with square
      thumbnails, display-size previews, and blur-up.
- [ ] Add the unresolved-listings callout with a direct review action.
- [ ] When a match is confirmed:
  - [ ] insert the listing into preview;
  - [ ] update filters and insights;
  - [ ] announce the addition;
  - [ ] offer `View in preview`; and
  - [ ] offer Undo.
- [ ] Keep the bounded three-card-tall scroll area, in-scroll Show more,
      persistent `Showing X of X`, and nonoverlapping Return to top.
- [ ] Keep shared basic and advanced catalog filters.

Acceptance:

- [ ] No unresolved candidate receives a reference image or cultivar facts.
- [ ] Seller data wins over reference fallbacks where intended.
- [ ] Card controls do not overlap content at desktop or mobile widths.
- [ ] Confirming a match produces a visible reward in preview.

### Slice 5 — Make collection insights accurate and interactive

**Outcome:** Insights provide personalized discoveries and lead directly back
to the matching catalog results.

Tasks:

- [ ] Base cultivar facts on linked unique cultivar IDs, not listing rows.
- [ ] State the basis and excluded unresolved count.
- [ ] Prioritize high-salience discoveries:
  - [ ] top hybridizers;
  - [ ] registration-year span or decades;
  - [ ] award-winning cultivars;
  - [ ] ploidy;
  - [ ] bloom season;
  - [ ] flower form; and
  - [ ] reference-photo coverage.
- [ ] Use narrative metrics when a chart would contain mostly values of one.
- [ ] Make each useful insight apply the existing preview filter.
- [ ] Preserve compatible active filters and show a removable filter summary.
- [ ] Move the seller back to preview after applying an insight.
- [ ] Recompute insights after match confirmation, change, undo, or exclusion.
- [ ] Lift only the controlled filter state required to connect insights and
      preview; do not add a generic workspace context.

Acceptance:

- [ ] Duplicate listings do not inflate unique-cultivar facts.
- [ ] Every interactive insight produces the expected preview result.
- [ ] Small catalogs still receive useful prose instead of empty charts.

### Slice 6 — Add persistent workspace status and navigation

**Outcome:** The seller can see remaining work and reach the next action from
anywhere without the page becoming a rigid wizard.

Tasks:

- [ ] Add a compact sticky desktop bar with:
  - [ ] Catalog preview;
  - [ ] Insights;
  - [ ] Review names with count;
  - [ ] Fix data with count; and
  - [ ] Download current/prepared workbook.
- [ ] Use a compact mobile bottom bar with remaining-work count and download.
- [ ] Choose the next task in this order:
  1. identity decision;
  2. required value;
  3. warning.
- [ ] Scroll/focus the destination without covering its heading or controls.
- [ ] Keep download available while work remains.
- [ ] Ensure sticky controls never cover validation, content, or issue actions.

Acceptance:

- [ ] Remaining work is visible while exploring preview and insights.
- [ ] `Review next` always reaches the correct unresolved item.
- [ ] Mobile has no competing sticky controls.

## Phase C — Repair

### Slice 7 — Complete cultivar review, revision, and undo

**Outcome:** Uncertain cultivar identity is a focused, understandable decision
workflow, and every link can be corrected later.

Tasks:

- [ ] Keep the one-at-a-time review model.
- [ ] Show all seller spreadsheet columns for the active source row.
- [ ] For each close candidate show:
  - [ ] reference photograph;
  - [ ] cultivar name;
  - [ ] hybridizer and year;
  - [ ] why it was suggested;
  - [ ] distinguishing registry details; and
  - [ ] explicit `Link this listing to …` action.
- [ ] Keep number-key selection as a secondary shortcut.
- [ ] Keep `X` as the Decide later shortcut within the match choices.
- [ ] Separate `Decide later` from `Leave unmatched`.
- [ ] Explain the prepared-workbook consequence of leaving a row unmatched.
- [ ] Keep Other match search below close matches.
- [ ] Give Other match search its own independent results and reset-to-source
      query action.
- [ ] Keep close and search result areas to three visible cards with internal
      vertical scrolling.
- [ ] Keep two-column image/details candidate cards on mobile.
- [ ] Allow previous/next navigation, reopening automatic links, changing
      manual links, and restoring an intentionally unmatched row.
- [ ] Add a direct one-level Undo for the latest identity decision.
- [ ] Do not add a generic command-history system.

Acceptance:

- [ ] Every pending row can be linked, deferred, or intentionally unmatched.
- [ ] Every link can be revised.
- [ ] Refresh restores queue contents, position, and completed decisions.
- [ ] Keyboard use supplements rather than replaces visible actions.

### Slice 8 — Complete spreadsheet issue repair

**Outcome:** Issues are grouped by meaning, all relevant rows are visible
together, and each action states exactly what it changes in the prepared file.

Issue levels:

- **Needs a decision:** identity cannot be established safely.
- **Needs a value:** required structured output needs seller input.
- **Warning:** data may be intentional but deserves inspection.

Tasks:

- [ ] Keep identity decisions in Slice 7's separate focused workflow.
- [ ] Show all rows for each spreadsheet issue group rather than one issue at a
      time.
- [ ] Price-format review:
  - [ ] show original value;
  - [ ] offer a suggested numeric unit price where safely parsed;
  - [ ] preserve bundle meaning in a note or original seller field;
  - [ ] use an icon-only row Save with an accessible name;
  - [ ] provide Save all for valid edited rows;
  - [ ] allow leaving the value unresolved; and
  - [ ] avoid calling valid seller offers intrinsically invalid.
- [ ] Keep a deliberately bounded parser for obvious formats such as
      `2 for $30`; do not build a pricing language.
- [ ] Possible duplicate review:
  - [ ] show related rows in one table;
  - [ ] default to the possibility that both listings are intentional;
  - [ ] offer Keep both listings;
  - [ ] offer `Remove row X from prepared workbook`;
  - [ ] state that the uploaded source file remains untouched; and
  - [ ] support Undo.
- [ ] Seller-image review distinguishes:
  - [ ] malformed URL;
  - [ ] timeout;
  - [ ] remote rejection;
  - [ ] browser/hotlink restriction;
  - [ ] unsupported format; and
  - [ ] successful preview.
- [ ] Say `We could not preview this seller image from your browser` when the
      failure reason is not knowable.
- [ ] Allow a linked reference photograph to remain in preview while clearly
      retaining the seller-image warning.
- [ ] Invalid saved-ID review:
  - [ ] try a new confident name match;
  - [ ] explain an automatic replacement;
  - [ ] require identity review when uncertain; and
  - [ ] never export an invalid ID as resolved identity.
- [ ] Add an unresolved path and undo for every issue action.

Acceptance:

- [ ] Every supported issue explains what was found, why it matters, what the
      action changes, and whether it may remain unresolved.
- [ ] Batch price saving cannot silently overwrite an invalid edit.
- [ ] Intentional same-cultivar listings can both remain.
- [ ] Image failures are not overdiagnosed.

## Phase D — Export and continue

### Slice 9 — Complete the prepared-workbook download experience

**Outcome:** Download is a clear, retryable product result whose contents match
the verified cleaned-workbook contract.

Tasks:

- [ ] Use `Download current workbook` while decisions remain.
- [ ] Use `Download prepared workbook` when all required decisions are done.
- [ ] Before generation, summarize:
  - [ ] retained worksheet count;
  - [ ] retained source-row count;
  - [ ] applied seller-approved corrections;
  - [ ] linked identity count;
  - [ ] intentionally unmatched count;
  - [ ] removed-row count;
  - [ ] unresolved values/warnings; and
  - [ ] workbook features not preserved.
- [ ] Explain that live reference photographs, awards, and cultivar attributes
      remain linked to Daylily Catalog and are not copied into the workbook.
- [ ] Use the stable filename
      `original-name-daylily-catalog-prepared.xlsx`.
- [ ] Keep CSV input/output behavior explicit.
- [ ] Ensure download generation cannot mutate the current in-browser project.
- [ ] Separate download failure state and retry from matching.
- [ ] Prove the output can be re-uploaded with identity fields recognized
      automatically.
- [ ] Verify all three samples and the real 1,087-row, three-sheet workbook.

Acceptance:

- [ ] Current and completed download labels reflect actual state.
- [ ] The pre-download summary matches the generated file.
- [ ] A failed download can be retried without rematching.
- [ ] The prepared file is an unambiguous future-import contract.

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

| Status              | Question or risk                                                                                       | Resolution path                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolved            | Which XLSX features does the current reconstruction actually preserve?                                 | It reconstructs browser-readable cell values and sheets; formulas, formatting, comments, merges, drawings, validation, and hidden state are not retained. |
| Deferred to Slice 8 | Should an approved bundle price write only numeric unit price or also populate an existing note field? | Preserve the original commercial meaning without inventing a new column; decide with the issue-repair UI.                                                 |
| Open in Slice 4     | Is a Catalog view/Data review toggle necessary?                                                        | First try customer-facing cards plus a simple details/change-match action; add a mode only if that is unclear.                                            |
| Open in Slice 5     | Which insights are useful for very small catalogs?                                                     | Rank available facts and prefer concise narrative metrics over empty or low-information charts.                                                           |
| Open in Slice 10    | What exact sign-in return URL preserves the local project?                                             | Reuse the existing auth return pattern and verify IndexedDB remains available on the same origin.                                                         |
| Open in Slice 12    | Does the preview need virtualization?                                                                  | Add it only if real measurements show the existing bounded rendering is not responsive.                                                                   |

## Work log

Add new entries at the top. Keep descriptions factual and link commits or
artifacts when useful.

| Date       | Slice    | Status   | What changed                                                                                                                  | Verification                                                                                                                                                              | Commit / notes                      |
| ---------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 2026-07-18 | Slice 0  | Complete | Implemented cleaned mapped fields and canonical identity headers; documented the verified XLSX value-copy contract.           | 25 focused tests, 3 importer E2Es, typecheck, lint with one unrelated existing warning, real Chrome download, full three-sheet value comparison, LibreOffice open/resave. | This Slice 0 commit.                |
| 2026-07-18 | Planning | Complete | Converted the full UI/UX review into a 14-slice implementation tracker; made cleaned-copy semantics the first gated contract. | Plan reviewed against the current product doc and PR boundary.                                                                                                            | Implementation begins with Slice 0. |

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
