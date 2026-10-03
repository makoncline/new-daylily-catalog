# Tags search verification

Tags now uses the app's shared Basic/Advanced search controls. Advanced
Listing filters include **Private Notes**. Text matching uses the existing
case-insensitive, normalized contains filter. Basic search, lists, price,
photos, and cultivar filters use the same columns and controls as Listings.

Selections stay selected when filters hide them. The page reports how many
selected listings are hidden. Preview and exports use the full selected set.
The table header selects only the visible page. **Reset** clears filters.
**Remove all** clears selection.

Tags filters and selection stay in page memory. Reload or leaving the route
clears them. Search mode and collapsed state retain their own Tags preferences.
Filter typing creates no URL parameters or browser history entries. URL filter
parameters are not restored for Tags. Global search can contain private notes,
so all Tags filters use this rule. The Tags surface blocks PostHog autocapture
and masks Sentry replay text. The owner-scoped dashboard read model remains the
only data source. No server procedure or public API was changed.

## Synthetic browser evidence

All captures use disposable integration fixtures and mock local providers.
No member database, printer, or outbound email service was used.

| View    | Before                                            | After with private-note filter                  |
| ------- | ------------------------------------------------- | ----------------------------------------------- |
| Desktop | [Before](evidence/tags-search/desktop-before.png) | [After](evidence/tags-search/desktop-after.png) |
| Phone   | [Before](evidence/tags-search/mobile-before.png)  | [After](evidence/tags-search/mobile-after.png)  |

The after captures show two selected listings. The `2026 FALL` filter displays
one matching listing. Both selected listings remain in preview and exports.

Run the focused browser flow from the repository root:

```sh
INTEGRATION_PORT=3240 TAGS_EVIDENCE_DIR=/tmp/tags-evidence \
  node apps/main/scripts/run-integration-local.mjs tags-search.integration.ts
```

The script provisions and removes its own database. Choose an unused port.
The flow runs at 1440×1000, 390×844, and 1024×1366 with touch enabled for the
phone and iPad sizes. It checks filter combinations, Basic/Advanced switching,
clear/reset, selection through no results, keyboard controls, navigation,
private text remaining local, and CSV/HTML/PDF/ZIP downloads. Another flow checks
loading, load failure, and recovery after refresh. Unit coverage checks loading
versus an empty account and URL synchronization opt-out.

## Validation

- Typecheck passed.
- Full lint passed with repository design warnings. Changed source files passed without warnings.
- Full Vitest run: 203 files, 799 tests passed with four workers. An initial default-worker run timed out in the existing shadcn lint test. Its focused retry and the full repeat passed.
- Focused Chromium browser flows passed on desktop, phone, and iPad-sized touch screens.
- Full Chromium integration suite: 26 tests passed.
- Focused WebKit flows: four tests passed, including loading/error recovery. The first WebKit run detected a test navigation race. Back now waits for the Dashboard to load before leaving. No errors are excluded from the assertion.

These checks verify simulated viewports and local provider boundaries. They do
not verify a physical iPad, Brother hardware, or production provider services.
