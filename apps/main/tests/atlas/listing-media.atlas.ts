import path from "node:path";
import type { Page } from "@playwright/test";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ImageManager } from "../e2e/pages/image-manager";
import { captureAtlasState, expect, test } from "./atlas-test";
import {
  ATLAS_MEDIA_POPULATED_TITLE,
  ATLAS_MEDIA_EMPTY_TITLE,
} from "../../scripts/atlas-media-fixtures.mjs";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };
const populatedListingTitle = ATLAS_MEDIA_POPULATED_TITLE;
const emptyListingTitle = ATLAS_MEDIA_EMPTY_TITLE;
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

async function checkPopulated(page: Page, viewport: typeof desktop) {
  const { images } = await openListingMedia(
    page,
    viewport,
    populatedListingTitle,
    9,
  );
  await expect(images.imageGrid()).toBeVisible();
}

async function checkEmpty(page: Page, viewport: typeof desktop) {
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
}

async function checkPreview(page: Page, viewport: typeof desktop) {
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
}

async function checkCrop(page: Page, viewport: typeof desktop) {
  await openListingMedia(page, viewport, emptyListingTitle, 0);
  await page.locator("#image-upload-input").setInputFiles(uploadPath);
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload" })).toBeEnabled();
}

test("Desktop populated image grid", async ({ page }) => {
  await checkPopulated(page, desktop);
  await captureAtlasState(page, "listing-media-desktop-populated");
});

test("Mobile populated image grid", async ({ page }) => {
  await checkPopulated(page, mobile);
  await captureAtlasState(page, "listing-media-mobile-populated");
});

test("Desktop empty image manager", async ({ page }) => {
  await checkEmpty(page, desktop);
  await captureAtlasState(page, "listing-media-desktop-empty");
});

test("Mobile empty image manager", async ({ page }) => {
  await checkEmpty(page, mobile);
  await captureAtlasState(page, "listing-media-mobile-empty");
});

test("Desktop full-size preview", async ({ page }) => {
  await checkPreview(page, desktop);
  await captureAtlasState(page, "listing-media-desktop-preview");
});

test("Mobile full-size preview", async ({ page }) => {
  await checkPreview(page, mobile);
  await captureAtlasState(page, "listing-media-mobile-preview");
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
  await checkCrop(page, desktop);
  await captureAtlasState(page, "listing-media-desktop-crop");
});

test("Mobile selected-file crop", async ({ page }) => {
  await checkCrop(page, mobile);
  await captureAtlasState(page, "listing-media-mobile-crop");
});
