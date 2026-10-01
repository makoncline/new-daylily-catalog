import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { expect, test } from "./fixtures";

test("seller creates and manages a list through the app", async ({ page }) => {
  const createdTitle = "Integration Created List";
  const editedTitle = "Integration Managed List";
  const description = "A list saved through the real application.";
  const listingTitle = "Existing Bloom";
  const lists = new DashboardLists(page);
  const manageList = new ManageListPage(page);
  const toast = (message: string) =>
    page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

  await lists.goto();
  await lists.isReady();

  await lists.createListButton.click();
  const createSurface = lists.createSurface();
  await expect(createSurface).toBeVisible();
  await createSurface.getByLabel("Title").fill(createdTitle);
  await createSurface
    .getByRole("button", { name: "Create List", exact: true })
    .click();
  await expect(toast("List created")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/lists\?editing=[^&]+$/);

  const editingId = new URL(page.url()).searchParams.get("editing");
  expect(editingId).toBeTruthy();

  await expect(lists.editDialog()).toBeVisible();
  await lists.editTitleInput().fill(editedTitle);
  await lists.editDescriptionInput().fill(description);
  await lists.surfaceSaveButton().click();
  await expect(toast("List updated")).toBeVisible();
  await expect(lists.editDialog()).toBeHidden();

  await lists.setGlobalSearch(editedTitle);
  await expect(lists.listRow(editedTitle)).toBeVisible();
  await lists.openFirstVisibleRowActions();
  const manageHref = await lists.manageRowActionHref();
  expect(manageHref).toBe(`/dashboard/lists/${editingId}`);

  await page.goto(manageHref!);
  await expect(manageList.heading).toContainText(editedTitle);
  await expect(manageList.titleInput).toHaveValue(editedTitle);
  await expect(manageList.descriptionInput).toHaveValue(description);
  await expect(manageList.addListingsTrigger).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No listings", exact: true }),
  ).toBeVisible();

  await manageList.openAddListingsDialog();
  await manageList.searchAddListings(listingTitle);
  await manageList.selectListingToAdd(listingTitle);
  await expect(manageList.listingRow(listingTitle)).toBeVisible();
  await expect(manageList.saveChangesButton).toBeEnabled();
  await manageList.saveChanges();
  await expect(toast("List updated")).toBeVisible();
  await expect(manageList.saveChangesButton).toBeDisabled();

  await page.reload();
  await manageList.isReady();
  await expect(manageList.heading).toContainText(editedTitle);
  await expect(manageList.titleInput).toHaveValue(editedTitle);
  await expect(manageList.descriptionInput).toHaveValue(description);
  await expect(manageList.listingRow(listingTitle)).toBeVisible();
});

test("cancelled removal review stays closed after selection and filter changes", async ({
  page,
}) => {
  const listId = "integration-favorites-list";
  const titles = ["Existing Bloom", "Integration Media Listing"];
  const manageList = new ManageListPage(page);
  await manageList.goto(listId);
  await expect(manageList.addListingsTrigger).toBeVisible();
  for (const title of titles) {
    await manageList.openAddListingsDialog();
    await manageList.searchAddListings(title);
    await manageList.selectListingToAdd(title);
    await expect(manageList.listingRow(title)).toBeVisible();
  }
  await manageList.saveChanges();
  await expect(manageList.saveChangesButton).toBeDisabled();

  await page.goto(
    `/dashboard/lists/${listId}?remove=integration-existing-listing,integration-media-listing`,
  );
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(titles[0]!);
  await expect(dialog).toContainText(titles[1]!);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();

  await manageList
    .listingRow(titles[0]!)
    .getByRole("checkbox", { name: "Select row" })
    .click();
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 1 selected",
  );
  await expect(dialog).toBeHidden();
  await manageList.setGlobalSearch(titles[0]!);
  await expect(manageList.removeSelectedButton()).toHaveCount(0);
  await manageList.setGlobalSearch("");
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 1 selected",
  );
  await expect(dialog).toBeHidden();
  await manageList.listingsTable
    .getByRole("checkbox", { name: "Select all", exact: true })
    .click();
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 2 selected",
  );
  await expect(dialog).toBeHidden();

  await manageList.clickRemoveSelected();
  await expect(dialog).toContainText(titles[0]!);
  await expect(dialog).toContainText(titles[1]!);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await manageList.goto(listId);
  await manageList.isReady();
  for (const title of titles) {
    await expect(manageList.listingRow(title)).toBeVisible();
  }
});
