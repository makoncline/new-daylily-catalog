import type { Page } from "@playwright/test";
import {
  CATALOG_LISTING_HEADERS,
  createSpreadsheetCsv,
} from "@/lib/catalog-importer";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 900, width: 1280 };
const mobile = { height: 874, width: 402 };

async function openImporter(page: Page, viewport = desktop) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard/imports");
  await expect(page.getByLabel("Playground file", { exact: true })).toBeVisible(
    { timeout: 30_000 },
  );
}

async function uploadSample(page: Page) {
  const csv = createSpreadsheetCsv([
    [...CATALOG_LISTING_HEADERS],
    ["Atlas Front Border Seedling", 15, null, null, null, null],
    ["Atlas Back Border Seedling", 25, null, null, null, null],
    ["Atlas Front Border Seedling", 20, null, null, null, null],
    [
      "Atlas Greenhouse Seedling",
      10,
      null,
      null,
      null,
      "unknown-atlas-cultivar",
    ],
  ]);
  await page.getByLabel("Playground file", { exact: true }).setInputFiles({
    name: "playground-catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(
    page.getByRole("heading", { name: "New (2)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Already in your catalog (will be skipped) (1)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Invalid (1)", exact: true }),
  ).toBeVisible();
}

test("Dashboard importer start", async ({ page }) => {
  await openImporter(page);
  await expect(
    page.getByRole("link", { name: "Playground", exact: true }),
  ).toHaveAttribute("href", "/playground");
  await captureAtlasState(page, "dashboard-importer-start");
});

for (const [viewport, state] of [
  [desktop, "dashboard-importer-ready"],
  [mobile, "dashboard-importer-mobile-ready"],
] as const) {
  test(state, async ({ page }) => {
    await openImporter(page, viewport);
    await uploadSample(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await captureAtlasState(page, state);
  });
}

test("Dashboard importer complete", async ({ page }) => {
  await openImporter(page);
  await uploadSample(page);
  await page
    .getByRole("button", { name: "Import 2 listings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Import complete" }),
  ).toContainText(
    "2 created. 1 skipped because they are already in your catalog.",
  );
  await captureAtlasState(page, "dashboard-importer-complete");
});
