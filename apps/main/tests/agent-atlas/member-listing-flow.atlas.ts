import { captureCheckpoint, expect, test } from "./atlas-test";
import { CreateListingDialog } from "../e2e/pages/create-listing-dialog";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ImageManager } from "../e2e/pages/image-manager";

test.setTimeout(180_000);

test("member listing creation and availability states", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks" ||
      process.env.HERMETIC_MODE === "1",
    "The realistic Rolling Oaks persona supplies representative listing states.",
  );

  const createDialog = new CreateListingDialog(page);
  const editDialog = new EditListingDialog(page);

  await page.goto("/dashboard/listings");
  await page.getByTestId("create-listing-button").click();
  await createDialog.isReady();
  await createDialog.searchAndSelectAhsListing("Stella", "Stella de Oro");
  await expect(createDialog.titleInput).toHaveValue("Stella de Oro");
  await captureCheckpoint(
    page,
    testInfo,
    "create-listing-cultivar-selected",
    "Create Listing after selecting a cultivar and inheriting its title.",
  );
  await createDialog.changeTitle("Stella de Oro — Double Fan");
  await captureCheckpoint(
    page,
    testInfo,
    "create-listing-custom-title",
    "Create Listing with a buyer-friendly custom title ready to create.",
  );
  await createDialog.cancel();

  await page.goto("/dashboard/listings?editing=3506");
  await editDialog.isReady();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  const originalTitle = await editDialog.getTitle();
  await editDialog.titleInput.fill(`${originalTitle} — unsaved preview`);
  await captureCheckpoint(
    page,
    testInfo,
    "edit-listing-unsaved-changes",
    "Listing editor with deliberate unsaved changes and an enabled save action.",
  );
  await editDialog.titleInput.fill("");
  await editDialog.titleInput.blur();
  await editDialog.clickSaveChanges();
  await expect(page.getByText(/required/i).last()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "edit-listing-validation-error",
    "Listing editor preventing a save because the required name is empty.",
  );
  await editDialog.titleInput.fill(originalTitle);
  await editDialog.titleInput.blur();
  await editDialog.close();

  for (const listing of [
    {
      id: "5831",
      state: "listing-availability-hidden",
      status: "Hidden",
      description: "A real hidden listing in the member editor.",
    },
    {
      id: "3438",
      state: "listing-availability-published-no-price",
      status: "Published",
      description: "A published catalog listing without a sale price.",
    },
    {
      id: "62",
      state: "listing-availability-for-sale",
      status: "Published",
      description: "A published listing with a buyer-visible sale price.",
    },
  ] as const) {
    await page.goto(`/dashboard/listings?editing=${listing.id}`);
    await editDialog.isReady();
    await expect(editDialog.statusSelect).toContainText(listing.status);
    await captureCheckpoint(page, testInfo, listing.state, listing.description);
  }

  await page.goto("/rollingoaksdaylilies/search?query=Arcane+Pattern");
  await expect(
    page.getByText("Arcane Pattern", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("$18.00", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-availability-public-card",
    "The corresponding published listing card and price seen by buyers.",
  );
});

test("member listing image reorder state", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks" ||
      process.env.HERMETIC_MODE === "1",
    "The realistic Rolling Oaks image-rich listing supplies reorder data.",
  );

  const editDialog = new EditListingDialog(page);
  const imageManager = new ImageManager(page);
  await page.goto("/dashboard/listings?editing=4259");
  await editDialog.isReady();
  const originalOrder = await imageManager.imageOrderIds();
  expect(originalOrder.length).toBeGreaterThanOrEqual(3);
  const first = originalOrder[0]!;
  const third = originalOrder[2]!;

  await imageManager.dragImageBefore(first, third);
  await expect(page.getByText("Image order updated", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-images-reordered",
    "Image manager after a real drag reorder with visible persistence confirmation.",
  );

  await imageManager.dragImageBefore(first, originalOrder[1]!);
  await expect.poll(() => imageManager.imageOrderIds()).toEqual(originalOrder);
});

test("member listing save states", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks" ||
      process.env.HERMETIC_MODE === "1",
    "The realistic Rolling Oaks persona supplies a restorable listing.",
  );

  const editDialog = new EditListingDialog(page);
  await page.goto("/dashboard/listings?editing=3506");
  await editDialog.isReady();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  const originalDescription = await editDialog.descriptionInput.inputValue();
  const temporaryDescription = `${originalDescription}\nAtlas save-state check.`;
  await editDialog.descriptionInput.fill(temporaryDescription);
  await editDialog.descriptionInput.blur();

  let releaseSave: (() => void) | undefined;
  const saveReleased = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/trpc/dashboardDb.listing.update*", async (route) => {
    await saveReleased;
    await route.continue();
  });
  const save = editDialog.clickSaveChanges();
  await expect(editDialog.descriptionInput).toBeDisabled();
  await captureCheckpoint(
    page,
    testInfo,
    "edit-listing-saving",
    "Listing editor locked while a real update request is pending.",
  );
  releaseSave?.();
  await save;
  await page.unroute("**/api/trpc/dashboardDb.listing.update*");
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "edit-listing-save-success",
    "Listing editor after a successful update with visible confirmation.",
  );

  await editDialog.close();
  await page.goto("/dashboard/listings?editing=3506");
  await editDialog.isReady();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await editDialog.descriptionInput.fill(originalDescription);
  await editDialog.descriptionInput.blur();
  await editDialog.clickSaveChanges();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();

  await editDialog.close();
  await page.goto("/dashboard/listings?editing=3506");
  await editDialog.isReady();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await editDialog.descriptionInput.fill(temporaryDescription);
  await editDialog.descriptionInput.blur();
  await page.route("**/api/trpc/dashboardDb.listing.update*", (route) =>
    route.abort("connectionfailed"),
  );
  await editDialog.clickSaveChanges();
  await expect(
    page.getByText("Failed to save changes", { exact: true }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "edit-listing-save-failure",
    "Listing editor preserving unsaved input after an update failure.",
    { allowExpectedErrors: true },
  );
});
