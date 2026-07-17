import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

interface MatchRequest {
  names: string[];
}

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
    cultivarReferenceId: `cultivar-${normalizedName}`,
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
    const request = route.request().postDataJSON() as MatchRequest;
    const results = request.names.map((name) => {
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

function sampleCsv(rowCount = 25) {
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const name =
      index === rowCount - 1 ? "Mystery Bloom" : `Daylily ${index + 1}`;
    return `${name},${(10 + index).toFixed(2)},Description ${index + 1},Bed ${index + 1}`;
  });

  return ["name,price,description,privateNote", ...rows].join("\n");
}

async function uploadSample(page: Page, rowCount = 25) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "spring-catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sampleCsv(rowCount)),
  });
}

test.describe("catalog importer", () => {
  test("cleans, reviews, filters, and downloads a spreadsheet", async ({
    page,
  }) => {
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");

    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Clean a daylily spreadsheet" }),
    ).toBeVisible();
    await expect(
      page.getByText("Drop a spreadsheet here, or choose a file"),
    ).toBeVisible();

    await uploadSample(page);

    await expect(
      page.getByText("spring-catalog.csv", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Map your columns" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Matched sample" }),
    ).toBeVisible();
    await expect(page.getByText("20 of 20 rows")).toBeVisible();

    const filter = page.getByPlaceholder("Filter cleaned rows…");
    await filter.fill("Daylily 3");
    await expect(page.getByText("1 of 20 rows")).toBeVisible();
    await page.getByRole("button", { name: "Reset" }).last().click();
    await expect(page.getByText("20 of 20 rows")).toBeVisible();

    const sampleDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download sample" }).click();
    const sampleDownload = await sampleDownloadPromise;
    expect(sampleDownload.suggestedFilename()).toBe(
      "spring-catalog-cleaned.csv",
    );

    await page.getByText("Pro workflow", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Cleaned list" }),
    ).toBeVisible();
    const cleanedList = page.getByRole("region", { name: "Cleaned list" });
    const proReset = cleanedList.getByRole("button", { name: "Reset" });
    if (await proReset.isVisible()) {
      await proReset.click();
    }
    await expect(page.getByText("25 of 25 rows")).toBeVisible();
    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 1 of 2",
    );
    await page.getByTestId("pager-next").click();
    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 2 of 2",
    );

    await page.getByLabel("Review match for Mystery Bloom").click();
    await page.getByRole("menuitem", { name: "Review cultivar match" }).click();
    await expect(
      page.getByRole("heading", { name: "Find a match for Mystery Bloom" }),
    ).toBeVisible();
    const candidateRow = page.getByRole("row").filter({
      has: page.getByRole("cell", { name: "Mystery Daylily", exact: true }),
    });
    await expect(candidateRow).toBeVisible();
    await candidateRow.getByRole("button", { name: "Use match" }).click();
    await expect(
      page.getByRole("heading", { name: "Find a match for Mystery Bloom" }),
    ).not.toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(download.suggestedFilename()).toBe("spring-catalog-cleaned.csv");
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath!, "utf8");
    expect(csv).toContain("Mystery Daylily");
    expect(csv.split("\r\n")).toHaveLength(26);
  });

  test("keeps the phone layout within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");
    await uploadSample(page, 4);

    await expect(
      page.getByRole("heading", { name: "Matched sample" }),
    ).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
