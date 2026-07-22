import type { Page } from "@playwright/test";
import type { CultivarMatchCandidate } from "../../src/lib/catalog-importer";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 900, width: 1280 };
const mobile = { height: 874, width: 402 };

function normalizeName(name: string) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

const cultivarFixtures: Record<string, Partial<CultivarMatchCandidate>> = {
  "chicago apache": {
    bloomHabit: "Diurnal",
    bloomSizeIn: 5,
    bloomSeason: "Midseason",
    color: "scarlet self with green throat",
    cultivarReferenceId: "cr-ahs-16938",
    flowerShow: "Large",
    fragrance: null,
    hybridizer: "Marsh-Klehm",
    imageAsset: {
      blurUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-16938/cmqk1dnj9019025rkptkyd8mr/blur-20.webp",
      displayUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-16938/cmqk1dnj9019025rkptkyd8mr/display-800.webp",
      id: "cmqk1dnj9019025rkptkyd8mr",
      originalUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-16938/cmqk1dnj9019025rkptkyd8mr/original.png",
      status: "ready",
      thumbUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-16938/cmqk1dnj9019025rkptkyd8mr/thumb-200.webp",
    },
    imageUrl:
      "https://media.daylilycatalog.com/cultivars/cr-ahs-16938/cmqk1dnj9019025rkptkyd8mr/display-800.webp",
    parentage: null,
    ploidy: "Tetraploid",
    rebloom: false,
    scapeHeightIn: 27,
    year: 1981,
  },
  "happy returns": {
    bloomHabit: "Extended",
    bloomSizeIn: 3.12,
    bloomSeason: "Extra Early",
    color: "light yellow self",
    cultivarReferenceId: "cr-ahs-24752",
    flowerShow: "Small",
    fragrance: "Fragrant",
    hybridizer: "Darrel A. Apps",
    imageAsset: {
      blurUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-24752/cmqk2xlum048825rk0rfvnok9/blur-20.webp",
      displayUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-24752/cmqk2xlum048825rk0rfvnok9/display-800.webp",
      id: "cmqk2xlum048825rk0rfvnok9",
      originalUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-24752/cmqk2xlum048825rk0rfvnok9/original.png",
      status: "ready",
      thumbUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-24752/cmqk2xlum048825rk0rfvnok9/thumb-200.webp",
    },
    imageUrl:
      "https://media.daylilycatalog.com/cultivars/cr-ahs-24752/cmqk2xlum048825rk0rfvnok9/display-800.webp",
    parentage: "(Suzie Wong × Stella De Oro)",
    ploidy: "Diploid",
    rebloom: false,
    scapeHeightIn: 18,
    year: 1986,
  },
  "ruby spider": {
    awardNames: "L/W|PC",
    bloomHabit: "Diurnal",
    bloomSizeIn: 9,
    bloomSeason: "Early",
    color: "ruby red spider self with yellow throat",
    cultivarReferenceId: "cr-ahs-9241",
    flowerShow: "Unusual Form",
    fragrance: null,
    form: "Single|Unusual Form, Spatulate",
    hybridizer: "Stamile",
    imageAsset: {
      blurUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-9241/cmqk35a0304qu25rktj5qpgdo/blur-20.webp",
      displayUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-9241/cmqk35a0304qu25rktj5qpgdo/display-800.webp",
      id: "cmqk35a0304qu25rktj5qpgdo",
      originalUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-9241/cmqk35a0304qu25rktj5qpgdo/original.png",
      status: "ready",
      thumbUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-9241/cmqk35a0304qu25rktj5qpgdo/thumb-200.webp",
    },
    imageUrl:
      "https://media.daylilycatalog.com/cultivars/cr-ahs-9241/cmqk35a0304qu25rktj5qpgdo/display-800.webp",
    parentage: "(Velvet Widow × Tet. Open Hearth)",
    ploidy: "Tetraploid",
    rebloom: false,
    scapeHeightIn: 34,
    year: 1991,
  },
  "stella de oro": {
    awardNames: "DFM|Stout",
    bloomHabit: "Extended",
    bloomSizeIn: 2.75,
    bloomSeason: "Early-Midseason",
    color: "gold self with very small green throat",
    cultivarReferenceId: "cr-ahs-40557",
    flowerShow: "Miniature",
    fragrance: "Fragrant",
    hybridizer: "Walter Jablonski",
    imageAsset: {
      blurUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-40557/8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73/blur-20.webp",
      displayUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-40557/8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73/display-800.webp",
      id: "8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73",
      originalUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-40557/8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73/original.png",
      status: "ready",
      thumbUrl:
        "https://media.daylilycatalog.com/cultivars/cr-ahs-40557/8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73/thumb-200.webp",
    },
    imageUrl:
      "https://media.daylilycatalog.com/cultivars/cr-ahs-40557/8e27c1ce-05e5-4ca2-80ad-8ef5c2034f73/display-800.webp",
    parentage: null,
    ploidy: "Diploid",
    rebloom: true,
    scapeHeightIn: 11,
    year: 1975,
  },
};

function candidate(name: string, confidence: number): CultivarMatchCandidate {
  const normalizedName = normalizeName(name);
  const fixture = cultivarFixtures[normalizedName] ?? {};

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
    ...fixture,
  };
}

async function mockCultivarMatches(page: Page) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const payload = route.request().postDataJSON() as { names: string[] };
    const results = payload.names.map((name) => {
      if (name.toLowerCase().includes("ooro")) {
        return {
          candidates: [candidate("Stella de Oro", 86)],
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
    "name,price,description,private note",
    "Happy Returns,15.00,Pale yellow fragrant bloom,Display row",
    "Chicago Apache,18.00,Velvety red flower,Back border",
    "Ruby Spider,24.00,Large ruby red spider,Feature bed",
    "Stella de Ooro,12.00,Golden yellow rebloomer,Check spelling",
  ].join("\n");
}

async function openCleaner(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await mockCultivarMatches(page);
  await page.goto("/catalog-importer");
  await expect(
    page.getByRole("heading", {
      name: "Build your daylily catalog",
    }),
  ).toBeVisible();
}

async function loadSpreadsheet(page: Page, csv = sampleCsv()) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "spring-catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
}

async function uploadSpreadsheet(page: Page) {
  await loadSpreadsheet(page);
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await expect(
    page.getByRole("region", { name: "Catalog preview ready" }),
  ).toBeVisible();
}

async function openReviewQuiz(page: Page) {
  await page.getByRole("button", { name: "Review 0/1" }).click();
  await expect(
    page.getByRole("heading", { name: "Review potential matches" }),
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

test("Desktop importer column mapping", async ({ page }) => {
  await openCleaner(page, desktop);
  await loadSpreadsheet(page);
  await expect(
    page.getByRole("button", { name: "Build catalog preview" }),
  ).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-mapping");
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

test("Desktop importer listing details", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await page
    .getByRole("button", { name: "View details for Happy Returns" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-details");
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

test("Desktop importer review complete", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await openReviewQuiz(page);
  await page.getByRole("button", { name: /Use match 1/ }).click();
  await expect(page.getByText("Names reviewed", { exact: true })).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-review-complete");
});

test("Desktop importer issues", async ({ page }) => {
  await openCleaner(page, desktop);
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await page.getByRole("button", { name: /Issues 0\// }).click();
  await expect(
    page.getByRole("region", { name: "Review spreadsheet data" }),
  ).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-issues");
});

test("Mobile importer issues", async ({ page }) => {
  await openCleaner(page, mobile);
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await page.getByRole("button", { name: /Issues 0\// }).click();
  await captureAtlasState(page, "catalog-importer-mobile-issues");
});

test("Desktop importer incomplete download", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await page.getByRole("button", { name: "Download" }).click();
  await page
    .getByRole("button", { name: "Download original workbook" })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-download-confirm");
});

test("Desktop importer download", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await page.getByRole("button", { name: "Download" }).click();
  await expect(
    page.getByRole("heading", { name: "Download your current spreadsheet" }),
  ).toBeVisible();
  await captureAtlasState(page, "catalog-importer-desktop-download");
});

test("Mobile importer download", async ({ page }) => {
  await openCleaner(page, mobile);
  await uploadSpreadsheet(page);
  await page.getByRole("button", { name: "Download" }).click();
  await captureAtlasState(page, "catalog-importer-mobile-download");
});

test("Desktop importer preview", async ({ page }) => {
  await openCleaner(page, desktop);
  await uploadSpreadsheet(page);
  await page.locator("#catalog-importer-preview").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Search and filter" }).click();
  await page.getByRole("switch", { name: "Advanced" }).click();
  await captureAtlasState(page, "catalog-importer-desktop-preview");
});

test("Mobile importer preview", async ({ page }) => {
  await openCleaner(page, mobile);
  await uploadSpreadsheet(page);
  await page.locator("#catalog-importer-preview").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Search and filter" }).click();
  await page.getByRole("switch", { name: "Advanced" }).click();
  await captureAtlasState(page, "catalog-importer-mobile-preview");
});
