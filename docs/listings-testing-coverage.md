## Listings page – coverage checklist

### Checklist

- [x] All tests run in mobile mode (touch enabled viewport)

### Login

- [x] Login via UI from home page
- [x] Programmatic login then Dashboard button to land on dashboard

- [x] Create listing (custom title)

  - [x] Open Create dialog → enter unique title → Create
  - [x] Edit dialog auto-opens; assert dialog open/closed states
  - [x] Update Description, Price, Private Notes → Save → Close
  - [x] Verify in table via global filter
  - [x] Verify in database (created row exists)

- [x] Row actions: Edit

  - [x] Open menu via row actions trigger (stable data-test-ids)
  - [x] Click Edit → assert dialog open
  - [x] Update Description → Save → Close → assert dialog closed
  - [x] Verify in table and in database

- [x] Row actions: Delete

  - [x] Open menu → Delete → confirm
  - [x] Verify row absent using global filter
  - [x] Verify in database (row deleted)

- [x] Create listing from AHS (Daylily Database)

  - [x] Open selector → search “Stella” → select “Stella de Oro” → Create
  - [ ] Click “Sync with AHS name” (explicitly exercise sync button)
  - [x] Create/select a new List in dialog → Save → Close
  - [x] Verify list badge prefix in table (truncated label)
  - [ ] Set Status to Hidden and verify in table

- [x] Lists faceted filter (basic)

  - [x] Apply single list (Favorites) and assert row count decreases or stays same
  - [ ] Apply multiple lists (multi-select) and verify combined filtering
  - [ ] Deterministic Clear filters without Reset
  - [ ] Validate filtered count badge (x / y) updates

- [x] Global filter (basic usage to locate rows)

  - [ ] Clear global filter resets rows and remains stable

- [ ] Sorting

  - [ ] Sort by Title (asc/desc) and verify first-row order
  - [x] Sort by Title persists in URL (query params)
  - [ ] Sort by Price (asc/desc) and verify numeric ordering
  - [ ] Spot-check sort on Status/Year/Hybridizer

- [ ] Per-column filters

  - [ ] Title filter control (header)
  - [x] Title filter persists in URL (query params)
  - [ ] Description and Private Notes filters
  - [ ] Summary (Daylily Database Description) filter

- [ ] Table Options (skipped for now)

  - [ ] Toggle visibility of multiple columns
  - [ ] Reset to default (confirmation flow)
  - [ ] Verify persistence after reload (local storage)

- [ ] Pagination (with URL persistence)

  - [ ] Change rows per page and verify row count
  - [x] Rows per page (page size) persists in URL (query params)
  - [ ] Navigate to next/previous pages when dataset exceeds one page; persisted in URL

- [x] CSV download

  - [x] Click “Download CSV” and verify a file is downloaded
  - [ ] When filtered, verify the CSV contains only filtered rows and expected headers
  - Note: current implementation downloads all rows (ignores filters); tests assert presence of filtered item only by design

- [x] Edit dialog behaviors
  - [x] Assert dialog open/closed when expected
  - [x] Image reorder persists to DB (drag last → first)
  - [x] Image delete persists to DB (count -1)
  - [x] Image add verified without S3 (DB insert + UI presence)
  - [ ] Name field blur auto-save (without pressing Save)
  - [ ] Unlink AHS listing and verify removal of AHS-bound metadata
  - [ ] Images: preview/popover

### Not yet covered (to add next)

- **Sorting**

  - Sort by Title (asc/desc) and verify first row order
  - Sort by Price (asc/desc) and verify numeric ordering
  - Spot-check sort on Status/Year/Hybridizer

- **Per-column filters**

  - Title filter control (header)
  - Description and Private Notes filters
  - Summary (Daylily Database Description) filter

- **Lists faceted filter – robustness**

  - Multi-select lists and verify combined filtering
  - Deterministic “Clear filters” interaction without relying on Reset
  - Validate filtered count badge (x / y) updates

- **Table Options – advanced** (skipped for now)

  - Reorder columns via drag-and-drop; verify order and pinned columns remain pinned
  - Toggle visibility of multiple columns; verify persistence after page reload (local storage)

- **Pagination**

  - Change rows per page (e.g., 100 → 50) and verify row count
  - Navigate to next/previous pages when dataset exceeds one page

- **Global filter**

  - Clear global filter and verify rows reset; debounce behavior not required but ensure stability
  - [x] Global filter persists in URL (query params)

- **Edit dialog – additional behaviors**

  - Name field blur auto-save (without pressing Save Changes)
  - Unlink AHS listing → verify removal of AHS-bound metadata
  - Images: upload, reorder, preview; image popover

### Image management – planned test details

We will add deterministic images in seed data and cover full image management flows in the edit dialog.

- Seed data preparation

  - Add 2–3 placeholder image URLs (stable, public) to one seeded listing (e.g., “Custom Purple Beauty”).
  - Ensure each image has an initial `order` index so we can assert reordering changes.

- Reorder and persistence

  - Open edit dialog → drag to reorder images (e.g., move last to first) → Save Changes → Close dialog.
  - Reopen the same listing → verify the new order persists (first/last thumbnails match previous step).

- Add and delete

  - Add a new image by URL (or upload if enabled) → verify it appears at the end (highest order) and Save.
  - Delete one image → Save → Close → Reopen → verify the deleted image is gone and ordering remains consistent.

- Constraints and UI behavior

  - Respect max images per listing (see `UPLOAD_CONFIG.MAX_IMAGES_PER_LISTING`); verify error or disabled state.
  - Exercise image preview/popover and confirm correct image displayed.

- Notes

  - Prefer seeded URLs to avoid flakiness from network uploads in CI.
  - Use data-testid or accessible labels on image items if reordering selectors are brittle.

- **CSV content validation**

  - When filtered, verify the CSV contains only filtered rows and expected headers

- **Mobile/responsive checks** (optional)
  - Lists/Table Options controls behavior in small viewport (sheet/dialog placement)

### Notes

- Row actions menu is located via a stable `data-testid` on the trigger for reliability.
- List badges in the table are truncated; assertions should use a stable prefix (e.g., “AHS MCP List”).
- Table state URL persistence covered: sort (Title), global filter, Title column filter, and page size.
- CSV download currently exports all rows (ignores filters); filtered-only content validation is deferred.
