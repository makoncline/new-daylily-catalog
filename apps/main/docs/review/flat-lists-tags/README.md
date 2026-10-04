# Flat Lists and Tags review

The forms and Tags sections now sit directly on the page. The change removes
the decorative Card wrappers from create list, shared edit/manage details,
Add Listings, list loading, the tag designer, and Choose listings.

The layout was checked against the actual pre-cleanup source:

- Lists: parent of `9802d3d3` (#414), `3fb74041`.
- Tags: parent of `8b224835` (#409), `0527d95f`.

The newer Field controls, validation, save/retry behavior, navigation guard,
draft history, loading status, empty states, selection controls, tag preview,
and exports remain. Tags uses plain sections instead of restoring its older
decorative designer border. Table, input, template-selection and physical tag
outlines remain. Profile, Listings and MCP are outside this change.

## Visual evidence

The left column shows merged main `9802d3d3`. The right column shows this
change. These are real Chromium screenshots from the same app, fixture data,
and viewport sizes. The contact sheets only resize and arrange the screenshots.

| Flow                                        | Desktop (1440 × 1000)              | Mobile (402 × 874)                |
| ------------------------------------------- | ---------------------------------- | --------------------------------- |
| Create, edit and manage list                | [Contact sheet](lists-desktop.png) | [Contact sheet](lists-mobile.png) |
| Tag designer, preview and listing selection | [Contact sheet](tags-desktop.png)  | [Contact sheet](tags-mobile.png)  |

The mobile tag preview preserves its real print dimensions. Its focusable
region scrolls sideways, with a visible instruction. The page itself does not
overflow. The template radio outlines show the selected control.

## Verification

- `SKIP_ENV_VALIDATION=1 pnpm main lint`: passed, 0 errors; 1205 repository design warnings.
- `SKIP_ENV_VALIDATION=1 pnpm main typecheck`: passed.
- Prettier and `git diff --check`: passed.
- 62 focused Vitest tests across 10 files: passed. These cover list boundary
  save, parent membership commit, error reporting, loading/missing resources,
  create history recovery, Add Listings and tag controls/models/downloads.
- 10 real-app Playwright cases: passed. These cover desktop/mobile create,
  edit, manage, Add Listings, validation, failed save/retry, membership
  persistence, duplicate exclusion, keyboard focus, save on navigation,
  populated deletion rejection, missing lists, breadcrumb recovery and
  canceled browser Back/Forward with retained drafts.
- The final desktop/mobile flat-layout cases were rerun after adding export
  content checks: 2 passed. HTML, PDF, image ZIP and CSV downloads contain
  data or valid file signatures. Sheet HTML contains the selected listing.
  Template validation, save/reload, filtered empty results, deselection and
  keyboard scrolling of full-size mobile previews passed.

Reproduce the browser checks from the repository root:

```sh
INTEGRATION_PORT=3270 node apps/main/scripts/run-integration-local.mjs \
  flat-layout.integration.ts list-management.integration.ts \
  tag-printing.integration.ts list-breadcrumb.integration.ts \
  surface-history.integration.ts editor-save.integration.ts
```

Set `LAYOUT_EVIDENCE_DIR` to an absolute local directory to save review captures.

The checks use the repository's local fixture providers, placeholder service
keys, an isolated temporary SQLite database, and ports 3270/3271. They do not
verify live Clerk/provider behavior. Browser requests outside localhost are
blocked. No production data was changed and no physical printing was attempted.
