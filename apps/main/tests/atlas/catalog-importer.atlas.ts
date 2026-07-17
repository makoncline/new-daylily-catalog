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
    bloomSizeIn: 5,
    bloomSeason: "Midseason",
    color: "Golden yellow",
    confidence,
    cultivarReferenceId: `cultivar-${normalizedName.replaceAll(" ", "-")}`,
    displayName: name,
    form: "Single",
    hybridizer: "Example",
    imageAsset: null,
    imageUrl: null,
    listingCount: 0,
    normalizedName,
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

async function openImporter(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await mockCultivarMatches(page);
  await page.goto("/catalog-importer");
  await expect(
    page.getByRole("heading", { name: "Clean a daylily spreadsheet" }),
  ).toBeVisible();
}

async function uploadSpreadsheet(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "spring-catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv()),
  });
  await expect(
    page.getByRole("heading", { name: "Matches", exact: true }),
  ).toBeVisible();
}

async function openReviewQuiz(page: Page) {
  await page.getByText("Pro workflow", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Matches", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Match unmatched names" }),
  ).toBeVisible();
}

test("Desktop importer upload", async ({ page }) => {
  await openImporter(page, desktop);
  await captureAtlasState(page, "catalog-importer-desktop-upload");
});

test("Mobile importer upload", async ({ page }) => {
  await openImporter(page, mobile);
  await captureAtlasState(page, "catalog-importer-mobile-upload");
});

test("Desktop importer results", async ({ page }) => {
  await openImporter(page, desktop);
  await uploadSpreadsheet(page);
  await captureAtlasState(page, "catalog-importer-desktop-results");
});

test("Mobile importer results", async ({ page }) => {
  await openImporter(page, mobile);
  await uploadSpreadsheet(page);
  await captureAtlasState(page, "catalog-importer-mobile-results");
});

test("Desktop importer review", async ({ page }) => {
  await openImporter(page, desktop);
  await uploadSpreadsheet(page);
  await openReviewQuiz(page);
  await captureAtlasState(page, "catalog-importer-desktop-review");
});

test("Mobile importer review", async ({ page }) => {
  await openImporter(page, mobile);
  await uploadSpreadsheet(page);
  await openReviewQuiz(page);
  await captureAtlasState(page, "catalog-importer-mobile-review");
});
