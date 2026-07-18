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
