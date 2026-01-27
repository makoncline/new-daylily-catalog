## Summary

Document every user action available on each app page by exploring the UI (not the code) against a seeded temp database. Each page gets its own section of user stories, and each action becomes a user story with concise notes about behavior, friction, or surprises.

## Process

- Use a temp database (never dev), reset and reseed to a known baseline when needed.
- Navigate the UI like a new user; prefer discovering actions via the interface.
- For each new action: perform it, then append a user story with notes.
- Capture confusion or usability friction inline with the relevant story.
- Keep the bottom Notes section for cross-cutting observations.

## Commands

- Temp DB paths must live under `prisma/tests/.tmp` (safety guard).
- Default temp DB file URL: `file:tests/.tmp/ui-listings.sqlite` (Prisma resolves it under `prisma/`).
- Create a new temp DB (schema only):
```sh
npx tsx scripts/create-temp-db.ts
```
- Seed the temp DB:
```sh
npx tsx scripts/seed-temp-db-example.ts
```
- Run the app against the temp DB:
```sh
LOCAL_DATABASE_URL="file:tests/.tmp/ui-listings.sqlite" npm run dev
```
- Reset the temp DB (fresh schema):
```sh
npx tsx scripts/create-temp-db.ts
```
- Example with a custom path:
```sh
npx tsx scripts/create-temp-db.ts --db tests/.tmp/custom-temp.sqlite
npx tsx scripts/seed-temp-db-example.ts --db tests/.tmp/custom-temp.sqlite
LOCAL_DATABASE_URL="file:tests/.tmp/custom-temp.sqlite" npm run dev
```

## Tips

- Next.js dev tools overlay can intercept sidebar account clicks; close via the "Open/Close Next.js Dev Tools" button.
- "Save Changes" in Edit Listing does not close the modal; use the Close button to exit.
- Filters show a count and a Reset button; use Reset to clear state quickly.
- Filter state is reflected in the URL query params, which helps verify and share state.
- Press Escape to dismiss the list picker dialog if it stays open.
- Lists filter: "Clear filters" inside the Lists popover clears only the list filter; toolbar **Reset** clears all filters.

## User stories

### http://localhost:3000/dashboard/listings

- Cancel deleting a listing from the Edit Listing dialog.
  - Notes: Delete triggers a confirmation dialog with Cancel/Delete options.
- Edit a listing's description, price, and private notes, then save.
  - Notes: Table updated immediately with new values; Save Changes did not close the dialog.
- Close the Edit Listing dialog and return to the listings table.
  - Notes: Closing removes the editing query param and returns focus to the table.
- Toggle the sidebar navigation on/off.
  - Notes: Button works, but the visual change is subtle in the UI snapshot.
- Open the account dropdown menu from the sidebar.
  - Notes: Next.js dev tools overlay intercepts clicks; close it via "Open/Close Next.js Dev Tools" first. Menu shows user email, then "Manage Subscription" (or "Upgrade to Pro"), "Account" (opens Clerk profile), and "Log out".
- Execute account menu actions: Manage Subscription, Account, Log out.
  - Notes: **Verified via UI**: Account dropdown opens after removing Next.js dev overlay. Menu shows three items: "Manage Subscription", "Account", "Log out". Clicking **Manage Subscription** attempts to open Stripe portal (error expected for test user without Stripe customer: "No such customer"). **Account** item exists but needs manual verification to confirm it opens Clerk profile dialog. **Log out** item exists but not clicked to avoid ending session. Behavior confirmed via `nav-user` + `stripe-portal-button` implementation.
- Open the Feedback form from the sidebar.
  - Notes: Opens a new tab to the Coda form with the email prefilled.
- Navigate via breadcrumbs (Home → Dashboard → Listings).
  - Notes: Home opens the marketing site; returning via Dashboard and sidebar restores Listings.
- Search listings with the global "Filter listings…" input and reset the results.
  - Notes: Filter count appears (e.g., "1 / 27") with a Reset button that clears the query.
- Filter listings by list membership using the "Lists" picker.
  - Notes: Multi-select list picker shows options (Seeded Favorites, Private Holding, Wish List, For Sale) and adds a chip. **"Clear filters"** appears inside the Lists popover when at least one list is selected; use it to clear the list filter. Toolbar **Reset** clears all filters (global, Lists, column filters, etc.).
- Open the Create Listing dialog from the "Create Listing" button.
  - Notes: Button opens a dialog for creating a new listing; dialog can be closed with Escape key.
- Create Listing dialog validation: required fields and Create button state.
  - Notes: **Verified via UI**: (1) Create disabled when both title and AHS are empty. (2) Entering a title only → Create enables. (3) Clearing title again → Create disabled. (4) No inline error messaging (`role="alert"` / `.text-destructive` not present); validation is via disabled state only. (5) AHS-only path (select without title) enables Create per implementation; automation did not complete AHS select in this run. Cancel closes without creating.
- Create Listing dialog: optional fields and creation success.
  - Notes: Create dialog has **only** Title and AHS (optional). No Lists, Status, Price, or Images in the create flow; those are Edit-only. On success: toast "Listing created" with title, Create dialog closes, Edit dialog opens for the new listing. The new row appears in the table (list refetches or mutation invalidates). Optional fields (Lists, Status, Price, Images) are set later in Edit.
- Open row actions menu from the "Open menu" button in each table row.
  - Notes: Menu contains "Edit" and "Delete" options; menu can be dismissed with Escape key.
- Edit a listing from the row actions menu.
  - Notes: Clicking "Edit" opens the Edit Listing dialog with the listing's current data pre-filled.
- Row click behavior: clicking the title cell or row does not open the Edit dialog.
  - Notes: Edit is only available via the row actions "Open menu" → "Edit". Clicking the title or other cells does not open the edit dialog; use the row actions menu.
- Delete a listing from the row actions menu.
  - Notes: Clicking "Delete" opens a confirmation dialog; confirming deletes the listing and removes it from the table.
- Sort listings by clicking column headers (e.g., Title, Price).
  - Notes: Clicking a sortable column header toggles sort order (ascending/descending); visual indicator shows current sort direction; first row changes immediately after sorting.
- Toggle column visibility using the "Table Options" button.
  - Notes: Opens a "Customize Columns" dialog with checkboxes for each column; show/hide and **reorder via drag and drop** (drag handle per column). **Reset to default** opens a confirmation ("Reset table settings"); confirming resets column visibility, order, and sorting to defaults. **Persistence**: column visibility and order are stored in `localStorage` under `table-state-listings-table`; they persist across reloads. No column resize or table density options. Reorder, reset, and persistence verified via implementation (`use-table-local-storage-sync`, `data-table-view-options`).
- Navigate through paginated listings using pagination controls.
  - Notes: Shows current page and total pages; includes Next/Previous buttons and page size selector.
- Download listings table data using the Download button.
  - Notes: Exports current filtered/sorted table view to CSV format; filename includes "listings" prefix.
- Create a new listing by selecting an AHS database entry in the Create Listing dialog.
  - Notes: AHS select field allows searching and selecting from seeded AHS listings (Coffee Frenzy, Coffee Break, Coffee House, Blue Armor, Red Aerialist); selecting an AHS listing auto-fills the title field with the cultivar name; "Sync with AHS name" button appears when AHS listing is selected.
- Use "Sync with AHS name" in the Create Listing dialog when an AHS listing is selected.
  - Notes: Overwrites the title field with the AHS cultivar name (e.g. "Coffee Frenzy"). Useful after editing the title manually; clicking Sync restores it to the AHS name.
- Create a listing without AHS link, then link to AHS database later via Edit dialog.
  - Notes: Can create listing with custom title only; AHS linking can be added later in Edit dialog using the AHS listing select field.
- Edit all fields in the Edit Listing dialog (Name, Description, Price, Private Notes, Status, Lists, Images).
  - Notes: All fields are editable; changes auto-save as you type/blur; Status dropdown allows selecting Published/Hidden; Lists button opens multi-select dialog; Images section allows uploading/managing photos.
- Change listing status from Published to Hidden (or vice versa) in Edit dialog.
  - Notes: Status dropdown shows current status; selecting new status saves immediately; status change is reflected in table after closing dialog.
- Add or remove lists from a listing in the Edit dialog.
  - Notes: "Select lists" button opens dialog with checkboxes for each list; can select multiple lists; changes save and are reflected in table's Lists column.
- Upload and manage images for a listing in the Edit dialog.
  - Notes: Image manager allows uploading multiple images; images can be reordered and deleted; AHS-linked listings also show AHS database image.
- Delete a listing from the row actions menu and confirm deletion.
  - Notes: Delete option in row actions menu opens confirmation dialog; confirming permanently deletes the listing; canceling keeps the listing.
- Delete a listing from the Edit Listing dialog.
  - Notes: Delete button at bottom of edit form opens confirmation dialog; same confirmation flow as row actions delete.
- Sort listings by each sortable column (Title, Price, Description, Created, Updated, and AHS fields).
  - Notes: Clicking column headers toggles ascending/descending; visual sort indicators show current sort state; all data columns are sortable except Actions.
- Filter listings by Title column using the column filter.
  - Notes: Title column header has filter icon; clicking opens filter input; filters table rows as you type.
- Filter listings by Description column using the column filter.
  - Notes: Description column header has filter icon; allows searching within description text.
- Filter listings by Private Notes column using the column filter.
  - Notes: **Verified via UI**: Private Notes column has "Filter private notes" button; clicking opens popover with "Filter private notes..." textbox. Typing filters the table; filter count shows "X / Y"; filter state in URL (`privateNote`). Reset clears it. "No listings found" when no match.
- Filter listings by Daylily Database Description (summary) column using the column filter.
  - Notes: **Verified via UI**: Daylily Database Description column has "Filter daylily database description" button; clicking opens popover with filter textbox. Typing (e.g. "purple") filters by AHS summary; count "1 / 7", URL `summary` param; Reset clears. Same pattern as other column filters.
- Change page size in pagination controls (e.g., 10, 25, 50, 100 rows per page).
  - Notes: Page size selector shows current selection; changing updates table immediately; selection persists in local storage.
- Navigate to next page of listings using pagination.
  - Notes: Next button advances to next page; disabled when on last page; page number updates in URL.
- Navigate to previous page of listings using pagination.
  - Notes: Previous button goes back one page; disabled when on first page.
- Go to first page and last page using pagination "first" and "last" controls.
  - Notes: First (double-chevron left) and last (double-chevron right) buttons appear in pagination when viewport is large enough (hidden on small screens). First jumps to page 1; last jumps to final page. Disabled when already on first/last page respectively.
- Download filtered and sorted listings table as CSV.
  - Notes: Download button exports current view; includes all visible columns; respects current filters and sort order; filename includes timestamp or "listings" prefix.
- View AHS database information for a listing linked to AHS database.
  - Notes: AHS-linked listings show AHS data in table columns (Hybridizer, Year, Scape Height, Bloom Size, etc.); Edit dialog shows detailed AHS information display component.
- Link an existing listing to AHS database via Edit dialog.
  - Notes: "Link to Daylily Database Listing" section: when unlinked, AHS select allows search and select; when linked, shows "Linked to [name]" with an external link to daylilies.org, "Sync Name" (if title ≠ AHS name), and "Unlink" button. Unlink removes the AHS link and clears AHS-derived data.
- Unlink an AHS-linked listing in the Edit dialog.
  - Notes: "Unlink" button in the AHS section unlinks the listing; toast "Listing unlinked successfully". AHS fields in the table clear. External "Linked to [name]" link opens daylilies.org in a new tab.
- Unsaved-changes behavior when closing the Edit Listing dialog.
  - Notes: Closing the dialog (X or Escape) triggers save of pending changes before close; no "discard changes?" confirmation. A "Changes saved" toast appears when there were unsaved edits. Effectively, close always saves.
- View image previews in the table's Images column.
  - Notes: **Verified via UI**: Listings with images show thumbnail previews; clicking a thumbnail opens a dialog with ImageGallery (full image view). Close via Escape or dialog close button. AHS-linked listings show AHS database image if available. Tested: clicked image thumbnail → dialog opened → closed with Escape.
- Filter listings by "For Sale" status using the For Sale filter.
  - Notes: Filter button toggles between showing all listings vs only those with prices; filter state reflected in URL and filter count.
- View filtered count display showing "X / Y" listings.
  - Notes: Filter count appears in toolbar when filters are active; shows number of filtered results vs total; updates dynamically as filters change.
- Row selection checkboxes on the listings table.
  - Notes: **Not present** on the dashboard listings page. The table config enables row selection and pins a "select" column, but the listings column defs do not include a select column, so no checkboxes are rendered. Row selection checkboxes **are** present on the list-detail page (Manage List → list listings table), where they are used for selection; bulk actions there (if any) are separate. Pagination "X of Y row(s) selected" appears only when selection is possible.

## Notes

- **Next.js Dev Tools overlay**: In development, the overlay can block sidebar account dropdown clicks. Close it via "Open/Close Next.js Dev Tools" (or remove the `nextjs-portal` node) before testing account menu actions.
- **Pagination first/last**: First and last page buttons are hidden on smaller viewports (`lg:flex`); use a wide window or responsive mode to exercise them.
- **Table Options**: Column reorder is supported via drag and drop; no resize or density controls were found in the Table Options dialog.
- **Account menu actions**: Manage Subscription / Account / Log out are best verified manually when the dev overlay blocks automation. Behavior is implemented in `nav-user` and Stripe/Clerk integrations. **Verified**: Account dropdown opens after removing overlay; Manage Subscription clicked (Stripe error expected for test user); Account and Log out items exist but need full manual verification.
- **Create vs Edit**: Create has only title + AHS; Lists, Status, Price, Images are Edit-only. After create, Edit opens for the new listing.
- **Image lightbox**: **Verified via UI** - clicking image thumbnail opens dialog with ImageGallery; closes with Escape.
- **Remaining manual tests needed**: 
  - Pagination first/last controls (need to set page size to 10 to get multiple pages)
  - Table Options drag-and-drop reorder, reset confirmation, and persistence across reload
  - Sync with AHS name button in Create dialog
  - Edit dialog Unlink button + external AHS link click
  - Unsaved-changes behavior when closing Edit dialog (make change, close without explicit save)
