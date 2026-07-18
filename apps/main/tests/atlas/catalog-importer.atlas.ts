import type { Page } from "@playwright/test";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 900, width: 1280 };
const mobile = { height: 874, width: 402 };

function normalizeName(name: string) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function candidate(name: string, confidence: number) {
  const normalizedName = normalizeName(name);

  return {
    bloomHabit: "Reblooms",
    bloomSizeIn: 5,
    bloomSeason: "Midseason",
    branches: 4,
    budCount: 18,
    color: "Golden yellow",
    confidence,
    cultivarReferenceId: `cultivar-${normalizedName.replaceAll(" ", "-")}`,
    displayName: name,
    foliageType: "Dormant",
    form: "Single",
    fragrance: "Fragrant",
    hybridizer: "Example",
    imageAsset: null,
    imageUrl: null,
    listingCount: 0,
    normalizedName,
    parentage: "Seedling x Example Parent",
    ploidy: "Diploid",
    rebloom: true,
    scapeHeightIn: 24,
    year: 2020,
  };
}

async function mockCultivarMatches(page: Page) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const payload = route.request().postDataJSON() as { names: string[] };
    const results = payload.names.map((name) => {
      if (name.toLowerCase().includes("mystery")) {
        return {
          candidates: [candidate("Mystery Daylily", 82)],
          exactMatch: null,
          inputName: name,
          normalizedInput: normalizeName(name),
        };
      }

      const exact = candidate(name, 100);
      return {
        candidates: [exact],
        exactMatch: exact,
        inputName: name,
        normalizedInput: normalizeName(name),
      };
    });

    await route.fulfill({
      body: JSON.stringify({ results }),
      contentType: "application/json",
      status: 200,
    });
  });
}

function sampleCsv() {
  return [
    "name,price,description,privateNote",
    "Stella de Oro,12.00,Golden yellow rebloomer,Front bed",
    "Happy Returns,15.00,Pale yellow fragrant bloom,Display row",
    "Chicago Apache,18.00,Velvety red flower,Back border",
    "Mystery Bloom,10.00,Needs a cultivar match,Holding area",
  ].join("\n");
}

async function openCleaner(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await mockCultivarMatches(page);
  await page.goto("/catalog-importer");
  await expect(
    page.getByRole("heading", {
      name: "Free daylily catalog spreadsheet cleaner",
    }),
  ).toBeVisible();
}

async function uploadSpreadsheet(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "spring-catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv()),
  });
  await page.getByRole("button", { name: "Preview catalog" }).click();
  await expect(
    page.getByRole("heading", { name: "Your catalog is taking shape" }),
  ).toBeVisible();
}

async function openReviewQuiz(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Match unmatched names" }),
  ).toBeVisible();
}

test("Desktop importer upload", async ({ page }) => {
  await openCleaner(page, desktop);
  await captureAtlasState(page, "catalog-importer-desktop-upload");
});

test("Mobile importer upload", async ({ page }) => {
  await openCleaner(page, mobile);
  await captureAtlasState(page, "catalog-importer-mobile-upload");
});

test("Desktop importer results", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await captureAtlasState(page, "catalog-importer-desktop-results");
});

test("Mobile importer results", async ({ page }) => {
  await openCleaner(page, mobile);
  await uploadSpreadsheet(page);
  await captureAtlasState(page, "catalog-importer-mobile-results");
});

test("Desktop importer review", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await openReviewQuiz(page);
  await captureAtlasState(page, "catalog-importer-desktop-review");
});

test("Mobile importer review", async ({ page }) => {
  await openCleaner(page, mobile);
  await uploadSpreadsheet(page);
  await openReviewQuiz(page);
  await captureAtlasState(page, "catalog-importer-mobile-review");
});

test("Desktop importer preview", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await page.locator("#catalog-importer-preview").scrollIntoViewIfNeeded();
  await page.getByRole("switch", { name: "Advanced" }).click();
  await captureAtlasState(page, "catalog-importer-desktop-preview");
});

test("Mobile importer preview", async ({ page }) => {
  await openCleaner(page, mobile);
  await uploadSpreadsheet(page);
  await page.locator("#catalog-importer-preview").scrollIntoViewIfNeeded();
  await page.getByRole("switch", { name: "Advanced" }).click();
  await captureAtlasState(page, "catalog-importer-mobile-preview");
});
