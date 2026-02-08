import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedListingImageManagerData,
  type ListingImageManagerSeedMeta,
} from "./utils/seed-listing-image-manager";

test.describe("listing image manager @local", () => {
  let seedMeta: ListingImageManagerSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedListingImageManagerData({ db });
    });
  });

  test("user can preview reorder and delete listing images without upload", async ({
    page,
    dashboardListings,
    editListingDialog,
    imageManager,
  }) => {
    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    const expectToast = async (message: string) => {
      await expect(toast(message)).toBeVisible();
    };

    const expectEditingParam = async (expected: string | null) => {
      await expect(page).toHaveURL(
        (url) => url.searchParams.get("editing") === expected,
      );
    };
    const expectImageOrder = async (ids: string[]) => {
      await expect(imageManager.imageItems()).toHaveCount(ids.length);
      for (const [index, id] of ids.entries()) {
        await expect(imageManager.imageItems().nth(index)).toHaveAttribute(
          "data-image-id",
          id,
        );
      }
    };

    const [firstImageId, secondImageId, thirdImageId] = seedMeta.imageIds;
    if (!firstImageId || !secondImageId || !thirdImageId) {
      throw new Error("Expected 3 seeded images");
    }

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await page.evaluate(() => {
      localStorage.removeItem("table-state-listings-table");
    });

    await page.goto(`/dashboard/listings?editing=${seedMeta.listingId}`);
    await dashboardListings.isReady();
    await editListingDialog.isReady();
    await expectEditingParam(seedMeta.listingId);
    await expect(imageManager.imageGrid()).toBeVisible();

    // Baseline state
    await expect(imageManager.imageItems()).toHaveCount(3);
    await expectImageOrder(seedMeta.imageIds);

    // Preview
    await imageManager.openImagePreviewById(firstImageId);
    await expect(page.getByRole("img", { name: "Gallery image" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("img", { name: "Gallery image" })).toHaveCount(0);

    // Reorder first image to the end by dragging it over the third image
    await imageManager.dragImageBefore(firstImageId, thirdImageId);
    await expectToast("Image order updated");

    const reorderedIds: [string, string, string] = [
      secondImageId,
      thirdImageId,
      firstImageId,
    ];
    await expectImageOrder(reorderedIds);

    // Reorder persistence after reload
    await page.reload();
    await dashboardListings.isReady();
    await editListingDialog.isReady();
    await expectImageOrder(reorderedIds);

    // Delete middle image
    const deletedImageId = reorderedIds[1];
    await imageManager.imageDeleteButtonById(deletedImageId).click();
    await imageManager.confirmImageDelete();
    await expectToast("Image deleted successfully");
    await expect(imageManager.imageItems()).toHaveCount(2);
    await expect(imageManager.imageItemById(deletedImageId)).toHaveCount(0);

    const remainingIds: [string, string] = [reorderedIds[0], reorderedIds[2]];
    await expectImageOrder(remainingIds);

    // Delete persistence after reload
    await page.reload();
    await dashboardListings.isReady();
    await editListingDialog.isReady();
    await expectImageOrder(remainingIds);
  });
});
