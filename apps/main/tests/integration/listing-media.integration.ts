import { ImageManager } from "../e2e/pages/image-manager";
import { expect, test } from "./fixtures";

test("seller previews, reorders, and deletes listing images", async ({
  page,
  editListingDialog,
}) => {
  const listingId = "integration-media-listing";
  const originalIds = [
    "integration-media-image-1",
    "integration-media-image-2",
    "integration-media-image-3",
  ];
  const reorderedIds = [originalIds[1]!, originalIds[2]!, originalIds[0]!];
  const imageManager = new ImageManager(page);
  const toast = (message: string) =>
    page.locator("[data-sonner-toast]").filter({ hasText: message }).first();
  const expectImageOrder = async (ids: string[]) => {
    await expect(imageManager.imageItems()).toHaveCount(ids.length);
    for (const [index, id] of ids.entries()) {
      await expect(imageManager.imageItems().nth(index)).toHaveAttribute(
        "data-image-id",
        id,
      );
    }
  };

  await page.goto(`/dashboard/listings?editing=${listingId}`);
  await editListingDialog.isReady();
  await expect(imageManager.imageGrid()).toBeVisible();
  await expectImageOrder(originalIds);

  await imageManager.openImagePreviewById(originalIds[0]!);
  await expect(page.getByRole("img", { name: "Gallery image" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("img", { name: "Gallery image" })).toHaveCount(0);

  await imageManager.dragImageBefore(originalIds[0]!, originalIds[2]!);
  await expect(toast("Image order updated")).toBeVisible();
  await expectImageOrder(reorderedIds);

  await editListingDialog.saveAndClose();
  await page.goto(`/dashboard/listings?editing=${listingId}`);
  await editListingDialog.isReady();
  await expectImageOrder(reorderedIds);

  const deletedImageId = reorderedIds[1]!;
  await imageManager.imageDeleteButtonById(deletedImageId).click();
  await imageManager.confirmImageDelete();
  await expect(toast("Image deleted successfully")).toBeVisible();
  await expect(imageManager.imageItemById(deletedImageId)).toHaveCount(0);

  const remainingIds = [reorderedIds[0]!, reorderedIds[2]!];
  await expectImageOrder(remainingIds);

  await editListingDialog.saveAndClose();
  await page.goto(`/dashboard/listings?editing=${listingId}`);
  await editListingDialog.isReady();
  await expectImageOrder(remainingIds);
});
