import type { Page } from "@playwright/test";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 900, width: 1280 };
const mobile = { height: 874, width: 402 };

function sampleCsv() {
  return [
    "name,price,description,private note",
    "Happy Returns,15.00,Pale yellow fragrant bloom,Display row",
    "Chicago Apache,18.00,Velvety red flower,Back border",
    "China Blush,24.00,Blush pink flower,Feature bed",
  ].join("\n");
}

function existingListingCsv({
  description = "Imported description",
  price = "20.00",
  privateNote = "Imported note",
} = {}) {
  const escapedNote = privateNote.replaceAll('"', '""');
  return [
    "name,price,description,private note",
    `Arcane Pattern,${price},${description},"${escapedNote}"`,
  ].join("\n");
}

function reviewCsv() {
  return [
    "name,price,description,private note",
    "Stella de Ooro,12.00,Golden yellow rebloomer,Check spelling",
  ].join("\n");
}

function issuesCsv() {
  return [
    "name,price,description,private note",
    "China Blush,20.00,First division,Front bed",
    "China Blush,18.00,Second division,Back bed",
    "Happy Returns,two for $30,Bundle price,Display row",
  ].join("\n");
}

async function mockCultivarMatches(page: Page) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const payload = route.request().postDataJSON() as { names: string[] };
    await route.fulfill({
      body: JSON.stringify({
        results: payload.names.map((name) => {
          const normalizedName = name.trim().toLowerCase();
          const cultivarReferenceIds: Record<string, string> = {
            "arcane pattern": "cr-ahs-181653",
            "chicago apache": "cr-ahs-16938",
            "china blush": "cr-ahs-17077",
            "happy returns": "cr-ahs-24752",
            "stella de oro": "cr-ahs-40557",
          };
          const needsReview = normalizedName === "stella de ooro";
          const exactMatch = {
            awardNames: null,
            bloomSizeIn: 5,
            bloomSeason: "Midseason",
            color: "Golden yellow",
            confidence: needsReview ? 86 : 100,
            cultivarReferenceId:
              (normalizedName === "stella de ooro"
                ? "cr-ahs-40557"
                : cultivarReferenceIds[normalizedName]) ??
              `atlas-${normalizedName.replaceAll(" ", "-")}`,
            displayName:
              normalizedName === "stella de ooro" ? "Stella de Oro" : name,
            form: "Single",
            hybridizer: "Atlas Example",
            imageAsset: null,
            imageUrl: null,
            listingCount: 0,
            normalizedName: needsReview ? "stella de oro" : normalizedName,
            ploidy: "Diploid",
            rebloom: false,
            scapeHeightIn: 24,
            year: 2000,
          };
          return {
            candidates: [exactMatch],
            exactMatch: needsReview ? null : exactMatch,
            inputName: name,
            normalizedInput: normalizedName,
          };
        }),
      }),
      contentType: "application/json",
      status: 200,
    });
  });
}

async function openDashboardImporter(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await mockCultivarMatches(page);
  await page.goto("/dashboard/imports");
  await expect(
    page.getByRole("heading", { name: "Import catalog" }),
  ).toBeVisible({ timeout: 30_000 });
}

async function expectNoPageOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

async function prepareListings(page: Page, csv = sampleCsv()) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "dashboard-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await expect(
    page.getByRole("heading", { name: /listings are ready to create/ }),
  ).toBeVisible({ timeout: 30_000 });
}

test("Dashboard importer start", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await captureAtlasState(page, "dashboard-importer-start");
});

test("Dashboard importer ready", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await captureAtlasState(page, "dashboard-importer-ready");
});

test("Dashboard importer row editor", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await page.getByRole("button", { name: /Edit / }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Edit import row" }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-row-editor");
});

test("Dashboard importer mobile ready", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page);
  await expect(page.getByRole("button", { name: /Edit / })).toHaveCount(3);
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-ready");
});

test("Dashboard importer mobile row editor", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page);
  await page.getByRole("button", { name: /Edit / }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Edit import row" }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-row-editor");
});

test("Dashboard importer cultivar review", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page, reviewCsv());
  await page
    .getByRole("button", { name: "Continue to cultivar review" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review potential matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to import" }),
  ).toBeDisabled();
  await captureAtlasState(page, "dashboard-importer-review");
});

test("Dashboard importer mobile cultivar review", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page, reviewCsv());
  await page
    .getByRole("button", { name: "Continue to cultivar review" })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue to import" }),
  ).toBeDisabled();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-review");
});

test("Dashboard importer data issues", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page, issuesCsv());
  await page.getByRole("button", { name: "Continue to data issues" }).click();
  await expect(
    page.getByRole("region", { name: "Review spreadsheet data" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to import" }),
  ).toBeDisabled();
  await captureAtlasState(page, "dashboard-importer-issues");
});

test("Dashboard importer mobile data issues", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page, issuesCsv());
  await page.getByRole("button", { name: "Continue to data issues" }).click();
  await expect(
    page.getByRole("button", { name: "Continue to import" }),
  ).toBeDisabled();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-issues");
});

test("Dashboard importer possible existing listing", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page, existingListingCsv());
  await page
    .getByRole("button", { name: "Continue to existing listings" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Decide how to handle existing listings",
    }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-existing");
});

test("Dashboard importer mobile existing listing", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page, existingListingCsv());
  await page
    .getByRole("button", { name: "Continue to existing listings" })
    .click();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-existing");
});

test("Dashboard importer exact existing listing", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(
    page,
    existingListingCsv({
      description: "Bed P3",
      price: "18.00",
      privateNote:
        "myCost: '10', from: '2018 Spring Hattiesburg Dayilily Meeting', ",
    }),
  );
  await expect(
    page.getByRole("heading", {
      name: "1 listing already exists and will be skipped",
    }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-already-exists");
});

test("Dashboard importer confirmation", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await page.getByRole("button", { name: "Continue to import" }).click();
  await expect(
    page.getByRole("heading", { name: "Create 3 listings?" }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-confirm");
});

test("Dashboard importer all listings already exist", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(
    page,
    existingListingCsv({
      description: "Bed P3",
      price: "18.00",
      privateNote:
        "myCost: '10', from: '2018 Spring Hattiesburg Dayilily Meeting', ",
    }),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Everything in this spreadsheet is already in your catalog",
    }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-all-existing");
});

test("Dashboard importer complete", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await page.getByRole("button", { name: "Continue to import" }).click();
  await page.getByRole("button", { name: "Create 3 listings" }).click();
  await expect(
    page.getByRole("heading", { name: "Your catalog has been imported" }),
  ).toBeVisible({ timeout: 30_000 });
  await captureAtlasState(page, "dashboard-importer-complete");
});
