import { expect, test } from "./fixtures";

test("seller creates, edits, and reloads a listing through the app", async ({
  page,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  const createdTitle = "Integration Tracer Listing";
  const editedTitle = "Integration Tracer Listing Edited";
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
  await createListingDialog.changeTitle(createdTitle);
  await createListingDialog.createListing();

  await expect(toast("Listing created")).toBeVisible();
  await editListingDialog.isReady();
  await editListingDialog.fillTitle(editedTitle);
  await editListingDialog.clickSaveChanges();
  await expect(toast("Changes saved")).toBeVisible();

  await page.reload();
  await dashboardListings.isReady();
  await dashboardListings.setGlobalSearch(editedTitle);
  await expect(dashboardListings.listingRow(editedTitle)).toBeVisible();
});
