import type { Page } from "@playwright/test";
import { DashboardProfile } from "../e2e/pages/dashboard-profile";
import { ImageManager } from "../e2e/pages/image-manager";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };

async function openProfile(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard/profile");

  const profile = new DashboardProfile(page);
  await profile.isReady();
  await expect(profile.gardenNameInput).not.toHaveValue("");
  await expect(profile.slugInput).not.toHaveValue("");
  await expect(profile.saveChangesButton).toBeDisabled();
  await expect(profile.contentEditor).toBeVisible();

  const images = new ImageManager(page);
  await expect(images.imageItems()).toHaveCount(5);
  return { images, profile };
}

async function checkPopulated(page: Page, viewport: typeof desktop) {
  await openProfile(page, viewport);
}

async function checkDirty(page: Page, viewport: typeof desktop) {
  const { profile } = await openProfile(page, viewport);
  await profile.gardenNameInput.fill("Rolling Oaks Daylilies — Unsaved");
  await expect(profile.saveChangesButton).toBeEnabled();
}

async function openUrlWarning(page: Page, viewport: typeof desktop) {
  const { profile } = await openProfile(page, viewport);
  await profile.slugInput.click();

  const dialog = page.getByRole("alertdialog", {
    name: "Before You Edit Your URL",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Changing your profile URL can break existing links",
  );
  return { dialog, profile };
}

async function checkUrlWarning(page: Page, viewport: typeof desktop) {
  await openUrlWarning(page, viewport);
}

async function checkInvalidUrl(page: Page, viewport: typeof desktop) {
  const { dialog, profile } = await openUrlWarning(page, viewport);
  await dialog.getByRole("button", { name: "Unlock URL editing" }).click();
  await expect(dialog).toBeHidden();
  await profile.slugInput.fill("bad");
  await profile.slugInput.blur();
  await expect(
    page.getByText("URL must be at least 5 characters"),
  ).toBeVisible();
  await expect(profile.saveChangesButton).toBeEnabled();
}

async function checkPreview(page: Page, viewport: typeof desktop) {
  const { images } = await openProfile(page, viewport);
  const firstImageId = await images
    .imageItems()
    .first()
    .getAttribute("data-image-id");
  if (!firstImageId) throw new Error("Expected a seeded profile image id.");

  await images.openImagePreviewById(firstImageId);
  await expect(page.getByRole("img", { name: "Gallery image" })).toBeVisible();
}

test("Desktop populated profile", async ({ page }) => {
  await checkPopulated(page, desktop);
  await captureAtlasState(page, "profile-management-desktop-populated");
});

test("Mobile populated profile", async ({ page }) => {
  await checkPopulated(page, mobile);
  await captureAtlasState(page, "profile-management-mobile-populated");
});

test("Desktop unsaved profile edit", async ({ page }) => {
  await checkDirty(page, desktop);
  await captureAtlasState(page, "profile-management-desktop-dirty");
});

test("Mobile unsaved profile edit", async ({ page }) => {
  await checkDirty(page, mobile);
  await captureAtlasState(page, "profile-management-mobile-dirty");
});

test("Desktop profile URL warning", async ({ page }) => {
  await checkUrlWarning(page, desktop);
  await captureAtlasState(page, "profile-management-desktop-url-warning");
});

test("Mobile profile URL warning", async ({ page }) => {
  await checkUrlWarning(page, mobile);
  await captureAtlasState(page, "profile-management-mobile-url-warning");
});

test("Desktop invalid profile URL", async ({ page }) => {
  await checkInvalidUrl(page, desktop);
  await captureAtlasState(page, "profile-management-desktop-url-invalid");
});

test("Mobile invalid profile URL", async ({ page }) => {
  await checkInvalidUrl(page, mobile);
  await captureAtlasState(page, "profile-management-mobile-url-invalid");
});

test("Desktop profile image preview", async ({ page }) => {
  await checkPreview(page, desktop);
  await captureAtlasState(page, "profile-management-desktop-preview");
});

test("Mobile profile image preview", async ({ page }) => {
  await checkPreview(page, mobile);
  await captureAtlasState(page, "profile-management-mobile-preview");
});
