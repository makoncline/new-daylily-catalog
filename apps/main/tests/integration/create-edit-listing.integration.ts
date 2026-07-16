import { expect, test } from "./fixtures";

test("seller creates, edits, and reloads a listing through the app", async ({
  page,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  const editedTitle = "Integration Tracer Listing Edited";
  const description = "A hermetic listing saved through the real application.";
  const privateNote = "Integration-only private note";
  const listName = "Integration Favorites";
  const toast = (message: string) =>
    page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

  await dashboardListings.goto();
  await dashboardListings.isReady();

  await dashboardListings.createListingButton.click();
  await createListingDialog.isReady();
  await createListingDialog.searchAndSelectAhsListing(
    "Integration Bloom",
    "Integration Bloom",
  );
  await createListingDialog.changeTitle("Integration Tracer Listing");
  await createListingDialog.createListing();

  await expect(toast("Listing created")).toBeVisible();
  await editListingDialog.isReady();
  await editListingDialog.fillTitle(editedTitle);
  await editListingDialog.fillDescription(description);
  await editListingDialog.fillPrice(37);
  await editListingDialog.fillPrivateNote(privateNote);
  await editListingDialog.setStatusToHidden();
  await editListingDialog.openListsPicker();
  await editListingDialog.toggleListByName(listName);
  await editListingDialog.closeListsPicker();
  await editListingDialog.clickSaveChanges();
  await expect(toast("Changes saved")).toBeVisible();
  await expect(editListingDialog.dialog).toBeHidden();

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(editedTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.globalSearchInput).toHaveValue(editedTitle);
  await expect(dashboardListings.listingRow(editedTitle)).toBeVisible();

  await page
    .locator('[data-testid="listing-row-actions-trigger"]:visible')
    .first()
    .click();
  await page.locator('[data-testid="listing-row-action-edit"]:visible').click();
  await editListingDialog.isReady();
  await expect(editListingDialog.titleInput).toHaveValue(editedTitle);
  await expect(editListingDialog.descriptionInput).toHaveValue(description);
  await expect(editListingDialog.priceInput).toHaveValue("37");
  await expect(editListingDialog.privateNoteInput).toHaveValue(privateNote);
  await expect(editListingDialog.statusSelect).toContainText("Hidden");
  await expect(editListingDialog.listSelectButton).toContainText(
    "Integration Fa",
  );
});

test("seller cannot persist a listing without a name", async ({
  page,
  dashboardListings,
  editListingDialog,
}) => {
  const existingTitle = "Existing Bloom";

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(existingTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow(existingTitle)).toBeVisible();
  await page
    .locator('[data-testid="listing-row-actions-trigger"]:visible')
    .first()
    .click();
  await page.locator('[data-testid="listing-row-action-edit"]:visible').click();
  await editListingDialog.isReady();

  await editListingDialog.titleInput.fill("");
  await editListingDialog.titleInput.blur();
  await editListingDialog.clickSaveChanges();

  await expect(
    editListingDialog.dialog.getByText("Name is required"),
  ).toBeVisible();
  await expect(editListingDialog.dialog).toBeVisible();

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(existingTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow(existingTitle)).toBeVisible();
});
