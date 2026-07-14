import { captureCheckpoint, expect, test } from "./atlas-test";
import path from "node:path";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ImageManager } from "../e2e/pages/image-manager";
import { ManageListPage } from "../e2e/pages/manage-list-page";

test.setTimeout(180_000);

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks" ||
      process.env.HERMETIC_MODE === "1",
    "Realistic Rolling Oaks data supplies large lists and image-rich listings.",
  );
});

test("manage one real catalog list", async ({ page }, testInfo) => {
  const list = new ManageListPage(page);
  await list.goto("5");
  await list.isReady();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-detail",
    "A production-sized list with editable details and its current listings.",
  );

  const originalDescription = await list.descriptionInput.inputValue();
  await list.descriptionInput.fill(`${originalDescription} Atlas preview.`);
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-unsaved-details",
    "List detail form with an unsaved description change.",
  );

  let releaseSave: (() => void) | undefined;
  const saveReleased = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/trpc/dashboardDb.list.update*", async (route) => {
    await saveReleased;
    await route.continue();
  });
  const save = list.saveChanges();
  await expect(list.descriptionInput).toBeDisabled();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-saving",
    "List form locked while its real update is pending.",
  );
  releaseSave?.();
  await save;
  await page.unroute("**/api/trpc/dashboardDb.list.update*");
  await expect(page.getByText("List updated", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-save-success",
    "List detail after a successful update with confirmation.",
  );
  await list.descriptionInput.fill(originalDescription);
  await list.saveChanges();

  await list.setGlobalSearch("Stella");
  await expect(list.filteredCount()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-search",
    "A large list narrowed with its listing search.",
  );
  await list.setGlobalSearch("");
  await list.sortByColumn("Title");
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-sort",
    "List contents ordered by listing title.",
  );
  await list.setGlobalSearch("no-such-realistic-listing-zzzz");
  await expect(
    page.getByRole("heading", { name: "No listings found" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-no-results",
    "List contents with a search that has no matches.",
  );
  await list.setGlobalSearch("");

  await list.openAddListingsDialog();
  await expect(list.addListingsSearchInput).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-add-listing",
    "Add Listings dialog for finding catalog inventory not yet in the list.",
  );
  await page.keyboard.press("Escape");

  await list.selectFirstVisibleRow();
  await list.clickRemoveSelected();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "manage-list-remove-confirmation",
    "Confirmation before removing selected listings from a list.",
  );
  await page.keyboard.press("Escape");
});

test("listing image upload states", async ({ page }, testInfo) => {
  const edit = new EditListingDialog(page);
  const images = new ImageManager(page);
  await page.goto("/dashboard/listings?editing=974");
  await edit.isReady();
  await expect(images.imageGrid()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-uploader",
    "Listing image section with its uploader and existing gallery.",
  );

  await page
    .locator("#image-upload-input")
    .setInputFiles(
      path.join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
  const useCrop = page.getByRole("button", { name: "Upload", exact: true });
  await expect(useCrop).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-crop",
    "Listing photograph in the real cropper before upload.",
  );

  let releasePresign: (() => void) | undefined;
  const presignReleased = new Promise<void>((resolve) => {
    releasePresign = resolve;
  });
  await page.route(
    "**/api/trpc/dashboardDb.image.getPresignedUrl*",
    async (route) => {
      await presignReleased;
      await route.abort("connectionfailed");
    },
  );
  const upload = useCrop.click();
  await expect(page.getByText(/Uploading image/)).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-uploading",
    "Listing image crop locked while upload preparation is pending.",
  );
  releasePresign?.();
  await upload;
  await expect(
    page.getByText("Failed to get upload URL", { exact: true }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-upload-failure",
    "Uploader preserving the crop after a failed upload preparation request.",
    { allowExpectedErrors: true },
  );
  await page.unroute("**/api/trpc/dashboardDb.image.getPresignedUrl*");
});

test("existing listing image and destructive states", async ({
  page,
}, testInfo) => {
  const edit = new EditListingDialog(page);
  const images = new ImageManager(page);
  await page.goto("/dashboard/listings?editing=974");
  await edit.isReady();
  await expect(images.imageItems()).not.toHaveCount(0, { timeout: 30_000 });

  const firstImage = (await images.imageOrderIds())[0]!;
  await images.openImagePreviewById(firstImage);
  await expect(page.getByRole("img", { name: "Gallery image" })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-preview",
    "Full-size preview of a real listing photograph.",
  );
  await page.keyboard.press("Escape");

  await images.imageDeleteButtonById(firstImage).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "listing-image-delete-confirmation",
    "Confirmation before permanently deleting a listing image.",
  );
  await page.keyboard.press("Escape");

  await edit.deleteListingButton.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "delete-listing-confirmation",
    "Confirmation before permanently deleting a listing.",
  );
  await page.keyboard.press("Escape");

  await expect(edit.unlinkAhsButton).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "unlink-cultivar-state",
    "Linked cultivar controls before an owner chooses to unlink registry data.",
  );
});
