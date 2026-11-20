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
    page.getByRole("heading", { name: "Importer", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function prepareListings(
  page: Page,
  csv = sampleCsv(),
  keepUnresolved = false,
) {
  await page
    .getByRole("link", { name: "Import a spreadsheet or list", exact: true })
    .click();
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "dashboard-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  if (keepUnresolved) {
    const keep = page.getByRole("button", {
      name: "Keep unlinked",
      exact: true,
    });
    while (await keep.count()) await keep.first().click();
    const price = page.getByRole("textbox", {
      name: "Price for Happy Returns",
      exact: true,
    });
    if (await price.count()) {
      await price.fill("30");
      await page
        .getByRole("button", { name: "Check again", exact: true })
        .click();
    }
  }
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await page
    .getByRole("button", { name: "Save to my catalog", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Importer", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function setUnfinishedState(page: Page, kind: "review" | "issues") {
  // Seed a recovered prepared draft to capture the account recovery surface.
  await page.evaluate(async (kind) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("keyval-store");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("keyval", "readwrite");
      const store = transaction.objectStore("keyval");
      const request = store.get("catalog-importer-draft:v2");
      request.onsuccess = () => {
        const draft = request.result as {
          matchedRows: { linkState: string; priceWarning: string | null }[];
        };
        draft.matchedRows[0]!.linkState =
          kind === "review" ? "pending" : "intentionally-unmatched";
        draft.matchedRows[0]!.priceWarning =
          kind === "issues" ? "Price needs review" : null;
        store.put(draft, "catalog-importer-draft:v2");
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, kind);
  await page.reload();
}

test("Dashboard importer start", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await expect(
    page.getByRole("link", { name: "Import a spreadsheet or list" }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-start");
});

test("Dashboard importer ready", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await expect(
    page.getByRole("heading", { name: "3 ready to import" }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-ready");
});

test("Dashboard importer mobile ready", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page);
  await expect(
    page.getByRole("heading", { name: "3 ready to import" }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-ready");
});

test("Dashboard importer excludes unreviewed listings", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page, reviewCsv(), true);
  await setUnfinishedState(page, "review");
  await expect(page.getByText("1 listing has not been reviewed")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import 1 listing" }),
  ).toHaveCount(0);
  await captureAtlasState(page, "dashboard-importer-review");
});

test("Dashboard importer mobile unreviewed listings", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page, reviewCsv(), true);
  await setUnfinishedState(page, "review");
  await expect(page.getByText("1 listing has not been reviewed")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import 1 listing" }),
  ).toHaveCount(0);
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-review");
});

test("Dashboard importer excludes unresolved issues", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page, issuesCsv(), true);
  await setUnfinishedState(page, "issues");
  await expect(
    page.getByText("1 listing has an unresolved issue"),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-issues");
});

test("Dashboard importer mobile unresolved issues", async ({ page }) => {
  await openDashboardImporter(page, mobile);
  await prepareListings(page, issuesCsv(), true);
  await setUnfinishedState(page, "issues");
  await expect(
    page.getByText("1 listing has an unresolved issue"),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  await captureAtlasState(page, "dashboard-importer-mobile-issues");
});

async function prepareEquivalentListing(page: Page) {
  await page.route("**/api/trpc/dashboardV2.listing.list**", async (route) => {
    const response = await route.fetch();
    const payload = (await response.json()) as {
      result: { data: { json: Record<string, unknown>[] } };
    };
    payload.result.data.json.push({
      id: "atlas-equivalent",
      title: "Arcane Pattern",
      cultivarReferenceId: "cr-ahs-181653",
      price: 20,
      description: "Imported description",
      privateNote: "Imported note",
    });
    await route.fulfill({ json: payload });
  });
  await prepareListings(page, existingListingCsv());
  await expect(
    page.getByText("Already saved · details unchanged", { exact: true }),
  ).toBeVisible();
}

for (const [viewport, state] of [
  [desktop, "dashboard-importer-existing"],
  [mobile, "dashboard-importer-mobile-existing"],
] as const) {
  test(state, async ({ page }) => {
    await openDashboardImporter(page, viewport);
    await prepareEquivalentListing(page);
    await expectNoPageOverflow(page);
    await captureAtlasState(page, state);
  });
}

test("Dashboard importer confirmation", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareEquivalentListing(page);
  await page
    .getByRole("button", { name: "Import 1 listing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import 1 listing?", exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "dashboard-importer-confirm");
});

test("Dashboard importer complete", async ({ page }) => {
  await openDashboardImporter(page, desktop);
  await prepareListings(page);
  await page.getByRole("button", { name: "Import 3 listings" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Selected rows saved",
    }),
  ).toBeVisible({ timeout: 30_000 });
  await captureAtlasState(page, "dashboard-importer-complete");
});
