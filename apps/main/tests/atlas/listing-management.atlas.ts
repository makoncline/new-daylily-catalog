import { CreateListingDialog } from "../e2e/pages/create-listing-dialog";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { captureAtlasState, expect, test } from "./atlas-test";

async function openListings(page: Parameters<typeof captureAtlasState>[0]) {
  await page.goto("/dashboard/listings?size=10");
  const listings = new DashboardListings(page);
  await listings.isReady();
  await expect(listings.listingTableReady).toBeVisible({ timeout: 30_000 });
  await expect(listings.pageIndicator()).toContainText("Page 1");
  return listings;
}

async function openFirstRowMenu(page: Parameters<typeof captureAtlasState>[0]) {
  const trigger = page
    .locator('[data-testid="listing-row-actions-trigger"]:visible')
    .first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.locator(
    '[data-slot="dropdown-menu-content"][data-state="open"]',
  );
  await expect(menu).toBeVisible();
  return menu;
}

async function openFirstListingForEdit(
  page: Parameters<typeof captureAtlasState>[0],
) {
  const menu = await openFirstRowMenu(page);
  await menu.getByTestId("listing-row-action-edit").click();
  const dialog = new EditListingDialog(page);
  await dialog.isReady();
  return dialog;
}

test("Listings table", async ({ page }) => {
  await openListings(page);
  await captureAtlasState(page, "listing-management-table");
});

test("Listing row actions", async ({ page }) => {
  await openListings(page);
  await openFirstRowMenu(page);
  await captureAtlasState(page, "listing-management-row-actions");
});

test("Listing search", async ({ page }) => {
  const listings = await openListings(page);
  await listings.setGlobalSearch("Richfield Muriel");
  await expect(listings.filteredCount()).toContainText("result");
  await expect(listings.listingsTable).toContainText("Richfield Muriel");
  await captureAtlasState(page, "listing-management-query");
});

test("Advanced listing search", async ({ page }) => {
  await openListings(page);
  const advanced = page.getByTestId("search-mode-switch");
  await advanced.click();
  await expect(advanced).toBeChecked();
  await captureAtlasState(page, "listing-management-advanced");
});

test("For sale filter", async ({ page }) => {
  const listings = await openListings(page);
  await page.getByRole("button", { name: "For Sale", exact: true }).click();
  await expect(listings.filteredCount()).toBeVisible();
  await captureAtlasState(page, "listing-management-for-sale");
});

test("List filter choices", async ({ page }) => {
  const listings = await openListings(page);
  await listings.openListsFilter();
  await expect(
    page.locator('[data-slot="command-item"]').first(),
  ).toBeVisible();
  await captureAtlasState(page, "listing-management-list-filter");
});

test("Sorted listings", async ({ page }) => {
  const listings = await openListings(page);
  await listings.sortByColumn("Title");
  await expect(listings.listingTableReady).toBeVisible();
  await captureAtlasState(page, "listing-management-sort");
});

test("Listings page two", async ({ page }) => {
  const listings = await openListings(page);
  await listings.goToNextPage();
  await expect(listings.pageIndicator()).toContainText("Page 2");
  await captureAtlasState(page, "listing-management-page-two");
});

test("No matching listings", async ({ page }) => {
  const listings = await openListings(page);
  await listings.setGlobalSearch("no-such-member-listing");
  await expect(listings.filteredCount()).toContainText("0");
  await captureAtlasState(page, "listing-management-no-results");
});

test("Create listing", async ({ page }) => {
  const listings = await openListings(page);
  await listings.createListingButton.click();
  const dialog = new CreateListingDialog(page);
  await dialog.isReady();
  await expect(dialog.createButton).toBeDisabled();
  await captureAtlasState(page, "listing-management-create-empty");
});

test("Cultivar picker results", async ({ page }) => {
  const listings = await openListings(page);
  await listings.createListingButton.click();
  const dialog = new CreateListingDialog(page);
  await dialog.isReady();
  await dialog.openAhsPicker();
  await dialog.ahsDialog
    .getByPlaceholder("Search AHS listings…")
    .fill("Stella");
  await expect(dialog.ahsDialog).toContainText("Stella de Oro");
  await captureAtlasState(page, "listing-management-cultivar-picker");
});

test("Cultivar selected", async ({ page }) => {
  const listings = await openListings(page);
  await listings.createListingButton.click();
  const dialog = new CreateListingDialog(page);
  await dialog.isReady();
  await dialog.searchAndSelectAhsListing("Stella", "Stella de Oro");
  await expect(dialog.titleInput).toHaveValue(/Stella de Oro/i);
  await captureAtlasState(page, "listing-management-create-selected");
});

test("Edit populated listing", async ({ page }) => {
  await openListings(page);
  const dialog = await openFirstListingForEdit(page);
  await expect(dialog.titleInput).not.toHaveValue("");
  await captureAtlasState(page, "listing-management-edit-populated");
});

test("Empty required listing name", async ({ page }) => {
  await openListings(page);
  const dialog = await openFirstListingForEdit(page);
  await dialog.titleInput.fill("");
  await dialog.titleInput.blur();
  await expect(dialog.saveChangesButton).toBeEnabled();
  await captureAtlasState(page, "listing-management-edit-validation");
});

test("Listing membership picker", async ({ page }) => {
  await openListings(page);
  const dialog = await openFirstListingForEdit(page);
  await dialog.openListsPicker();
  await expect(
    page.getByRole("heading", { name: "Select Lists" }),
  ).toBeVisible();
  await captureAtlasState(page, "listing-management-list-picker");
});
