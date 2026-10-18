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

test("deletes and partial reorders keep browser and stored image order aligned", async ({
  page,
  editListingDialog,
}) => {
  const id = "image-order-race";
  const ids = ["race-a", "race-b", "race-c", "race-d"];
  const manager = new ImageManager(page);
  const { withTempE2EDb } = await import("@/lib/test-utils/e2e-db");
  let release = () => {};
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  let responseHeld = () => {};
  const held = new Promise<void>((resolve) => {
    responseHeld = resolve;
  });
  await withTempE2EDb(
    async (db) => {
      await db.listing.create({
        data: {
          id,
          userId: "integration-user",
          title: "Image order race",
          slug: id,
        },
      });
      await db.image.createMany({
        data: ids.map((imageId, order) => ({
          id: imageId,
          listingId: id,
          url: "/assets/bouquet.png",
          order,
        })),
      });
      await db.imageAsset.createMany({
        data: ids.map((imageId, order) => ({
          id: `asset-${imageId}`,
          legacyImageId: imageId,
          kind: "listing",
          listingId: id,
          order,
        })),
      });
    },
    { clearFirst: false },
  );
  try {
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    await expect(manager.imageItems()).toHaveCount(4);
    await manager.imageDeleteButtonById("race-b").click();
    await manager.confirmImageDelete();
    await expect(manager.imageItemById("race-b")).toHaveCount(0);
    await page.route(
      "**/api/trpc/*dashboardV2.image.delete*",
      async (route) => {
        const response = await route.fetch();
        responseHeld();
        await delivery;
        await route.fulfill({ response });
      },
    );
    await page.route(
      "**/api/trpc/*dashboardV2.bootstrap.catalog*",
      async (route) => {
        await held;
        const response = await route.fetch();
        await route.fulfill({ response });
      },
    );
    await page.getByTestId("dashboard-refresh").click();
    await manager.imageDeleteButtonById("race-c").click();
    await manager.confirmImageDelete();
    await held;
    // A complete refresh applies the real deletion before its response arrives.
    await expect(manager.imageItemById("race-c")).toHaveCount(0);
    release();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await withTempE2EDb(
      async (db) => {
        expect(
          (
            await db.image.findMany({
              where: { listingId: id },
              orderBy: { order: "asc" },
            })
          ).map((row) => row.order),
        ).toEqual([0, 3]);
        // Another tab attaches an image that this browser has not loaded yet.
        await db.image.create({
          data: {
            id: "race-e",
            listingId: id,
            url: "/assets/bouquet.png",
            order: 4,
          },
        });
        await db.imageAsset.create({
          data: {
            id: "asset-race-e",
            legacyImageId: "race-e",
            kind: "listing",
            listingId: id,
            order: 4,
          },
        });
      },
      { clearFirst: false },
    );
    await manager.dragImageBefore("race-d", "race-a");
    await expect
      .poll(() => manager.imageOrderIds())
      .toEqual(["race-d", "race-a", "race-e"]);
    await withTempE2EDb(
      async (db) => {
        for (const rows of [
          await db.image.findMany({
            where: { listingId: id },
            orderBy: { order: "asc" },
          }),
          await db.imageAsset.findMany({
            where: { listingId: id },
            orderBy: { order: "asc" },
          }),
        ]) {
          expect(rows.map((row) => row.order)).toEqual([0, 1, 2]);
        }
      },
      { clearFirst: false },
    );
    await page.unroute("**/api/trpc/*dashboardV2.bootstrap.catalog*");
    await page.route("**/api/trpc/*dashboardV2.bootstrap.catalog*", (route) =>
      route.abort("failed"),
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await editListingDialog.isReady();
    await expect
      .poll(() => manager.imageOrderIds())
      .toEqual(["race-d", "race-a", "race-e"]);
  } finally {
    release();
    await page.unroute("**/api/trpc/*dashboardV2.image.delete*");
    await page.unroute("**/api/trpc/*dashboardV2.bootstrap.catalog*");
    await withTempE2EDb(
      async (db) => {
        await db.imageAsset.deleteMany({ where: { listingId: id } });
        await db.listing.deleteMany({ where: { id } });
      },
      { clearFirst: false },
    );
  }
});
