import { captureCheckpoint, expect, test } from "./atlas-test";

const hermetic = process.env.HERMETIC_MODE === "1";

test("catalog directory", async ({ page }, testInfo) => {
  await page.goto("/catalogs");
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs" }),
  ).toBeVisible();
  await captureCheckpoint(page, testInfo, "catalog-directory");
});

test("Rolling Oaks public catalog", async ({ page }, testInfo) => {
  await page.goto(hermetic ? "/hermetic-pro-garden" : "/rollingoaksdaylilies");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    hermetic ? "Hermetic Pro Garden" : "RollingOaksDaylilies",
  );
  await captureCheckpoint(page, testInfo, "rolling-oaks-public-catalog");
});

test("PlantFancy public catalog", async ({ page }, testInfo) => {
  await page.goto(hermetic ? "/hermetic-second-garden" : "/plantfancygardens");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    hermetic ? "Hermetic Second Garden" : "PlantFancyGardens",
  );
  await captureCheckpoint(page, testInfo, "plant-fancy-public-catalog");
});

test("representative public listing", async ({ page }, testInfo) => {
  await page.goto(
    hermetic
      ? "/hermetic-pro-garden/seeded-daylily-1"
      : "/plantfancygardens/blueberry-candy",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    hermetic ? "Hermetic Pro Garden Daylily 01" : "Blueberry Candy",
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
  await page.goto(hermetic ? "/hermetic-pro-garden" : "/rollingoaksdaylilies");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    hermetic ? "Hermetic Pro Garden" : "RollingOaksDaylilies",
  );
  await captureCheckpoint(page, testInfo, "rolling-oaks-public-mobile");
});
