import path from "node:path";
import type { Page } from "@playwright/test";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ImageManager } from "../e2e/pages/image-manager";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };
const populatedListingTitle = "18-33";
const emptyListingTitle = "Bee-ba-tized";
const uploadPath = path.resolve(
  import.meta.dirname,
  "../../public/assets/catalog-blooms.webp",
);

async function openListingMedia(
  page: Page,
  viewport: typeof desktop,
  listingTitle: string,
  expectedImageCount: number,
) {
  await page.setViewportSize(viewport);
  await page.goto(
    `/dashboard/listings?size=10&query=${encodeURIComponent(listingTitle)}`,
  );

  const listings = new DashboardListings(page);
  await listings.isReady();
  await expect(listings.listingTableReady).toBeVisible({ timeout: 30_000 });
  await expect(listings.rows()).toHaveCount(1);
  await expect(listings.listingRow(listingTitle)).toBeVisible();

  const rowAction = page.locator(
    '[data-testid="listing-row-actions-trigger"]:visible',
  );
  await expect(rowAction).toHaveCount(1);
  await rowAction.scrollIntoViewIfNeeded();
  await rowAction.click();

  const menu = page.locator(
    '[data-slot="dropdown-menu-content"][data-state="open"]',
  );
  await expect(menu).toBeVisible();
  await menu.getByTestId("listing-row-action-edit").click();

  const editor = new EditListingDialog(page);
  await editor.isReady();
  await expect(editor.titleInput).toHaveValue(listingTitle);
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("editing") !== null,
  );

  const images = new ImageManager(page);
  await expect(images.imageItems()).toHaveCount(expectedImageCount);
  return { editor, images };
}

async function capturePopulated(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const { images } = await openListingMedia(
    page,
    viewport,
    populatedListingTitle,
    9,
  );
  await expect(images.imageGrid()).toBeVisible();
  await captureAtlasState(page, stateId);
}

async function captureEmpty(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const { images } = await openListingMedia(
    page,
    viewport,
    emptyListingTitle,
    0,
  );
  await expect(images.imageGrid()).toHaveCount(0);
  await expect(
    page.getByText("Drag and drop an image here, or click to select one", {
      exact: true,
    }),
  ).toBeVisible();
  await captureAtlasState(page, stateId);
}

async function capturePreview(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const { images } = await openListingMedia(
    page,
    viewport,
    populatedListingTitle,
    9,
  );
  const firstImageId = await images
    .imageItems()
    .first()
    .getAttribute("data-image-id");
  if (!firstImageId) throw new Error("Expected a seeded listing image id.");

  await images.openImagePreviewById(firstImageId);
  await expect(page.getByRole("img", { name: "Gallery image" })).toBeVisible();
  await captureAtlasState(page, stateId);
}

async function captureCrop(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  await openListingMedia(page, viewport, emptyListingTitle, 0);
  await page.locator("#image-upload-input").setInputFiles(uploadPath);
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload" })).toBeEnabled();
  await captureAtlasState(page, stateId);
}

test("Desktop populated image grid", async ({ page }) => {
  await capturePopulated(page, desktop, "listing-media-desktop-populated");
});

test("Mobile populated image grid", async ({ page }) => {
  await capturePopulated(page, mobile, "listing-media-mobile-populated");
});

test("Desktop empty image manager", async ({ page }) => {
  await captureEmpty(page, desktop, "listing-media-desktop-empty");
});

test("Mobile empty image manager", async ({ page }) => {
  await captureEmpty(page, mobile, "listing-media-mobile-empty");
});

test("Desktop full-size preview", async ({ page }) => {
  await capturePreview(page, desktop, "listing-media-desktop-preview");
});

test("Mobile full-size preview", async ({ page }) => {
  await capturePreview(page, mobile, "listing-media-mobile-preview");
});

test("Delete image confirmation", async ({ page }) => {
  const { images } = await openListingMedia(
    page,
    desktop,
    populatedListingTitle,
    9,
  );
  await images.imageItems().first().getByTestId("image-delete-button").click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureAtlasState(page, "listing-media-delete-confirmation");
});

test("Pointer reorder target", async ({ page }) => {
  const { images } = await openListingMedia(
    page,
    desktop,
    populatedListingTitle,
    9,
  );
  const firstItem = images.imageItems().first();
  const firstHandle = firstItem.getByTestId("image-drag-handle");
  const handleBox = await firstHandle.boundingBox();
  if (!handleBox) throw new Error("Expected a visible image drag handle.");

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 100,
    handleBox.y + handleBox.height / 2,
    { steps: 5 },
  );
  await expect(firstHandle).toHaveAttribute("aria-pressed", "true");
  await expect(firstItem.locator(":scope > div")).toHaveAttribute(
    "style",
    /translate3d\((?!0px)/,
  );

  await captureAtlasState(page, "listing-media-reorder-active");
  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("Desktop selected-file crop", async ({ page }) => {
  await captureCrop(page, desktop, "listing-media-desktop-crop");
});

test("Mobile selected-file crop", async ({ page }) => {
  await captureCrop(page, mobile, "listing-media-mobile-crop");
});
