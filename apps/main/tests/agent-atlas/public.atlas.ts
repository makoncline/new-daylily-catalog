import { captureCheckpoint, expect, test } from "./atlas-test";

test("catalog directory", async ({ page }, testInfo) => {
  await page.goto("/catalogs");
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs" }),
  ).toBeVisible();
  await captureCheckpoint(page, testInfo, "catalog-directory");
});

test("Rolling Oaks public catalog", async ({ page }, testInfo) => {
  await page.goto("/rollingoaksdaylilies");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "RollingOaksDaylilies",
  );
  await captureCheckpoint(page, testInfo, "rolling-oaks-public-catalog");
});

test("PlantFancy public catalog", async ({ page }, testInfo) => {
  await page.goto("/plantfancygardens");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "PlantFancyGardens",
  );
  await captureCheckpoint(page, testInfo, "plant-fancy-public-catalog");
});

test("representative public listing", async ({ page }, testInfo) => {
  await page.goto("/plantfancygardens/blueberry-candy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Blueberry Candy",
  );
  await captureCheckpoint(page, testInfo, "representative-public-listing");
});

test("signed-out onboarding", async ({ page }, testInfo) => {
  await page.goto("/onboarding");
  await expect(page.locator("main")).toBeVisible();
  await captureCheckpoint(page, testInfo, "signed-out-onboarding");
});

test("catalog directory @mobile", async ({ page }, testInfo) => {
  await page.goto("/catalogs");
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs" }),
  ).toBeVisible();
  await captureCheckpoint(page, testInfo, "catalog-directory-mobile");
});

test("large catalog @mobile", async ({ page }, testInfo) => {
  await page.goto("/rollingoaksdaylilies");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "RollingOaksDaylilies",
  );
  await captureCheckpoint(page, testInfo, "rolling-oaks-public-mobile");
});
