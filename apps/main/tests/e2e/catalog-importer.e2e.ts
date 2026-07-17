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
    color: "Golden yellow with a deep raspberry eye and matching picotee edge",
    confidence,
    cultivarReferenceId: `cultivar-${normalizedName}`,
    displayName: name,
    form: "Single, unusual form cascade",
    hybridizer: "Example Hybridizer",
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
      if (name.toLowerCase().includes("alternate")) {
        return {
          candidates: [
            candidate("Alternate Bloom", 88),
            candidate("Alternate Star", 76),
            candidate("Alternate Glow", 64),
            candidate("Alternate Dream", 52),
            candidate("Alternate Sky", 40),
          ],
          exactMatch: null,
          inputName: name,
          normalizedInput: normalizeName(name),
        };
      }
      if (name.toLowerCase().includes("vanguard")) {
        return {
          candidates: [
            candidate("Vanguard", 82),
            candidate("Van Wade", 50),
            candidate("Vanguard Star", 45),
            candidate("Vanguard Glow", 40),
            candidate("Vanguard Dream", 35),
          ],
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
      index === rowCount - 1
        ? "Mystery Bloom"
        : index === rowCount - 2
          ? "Vanguard 2"
          : index === 10
            ? "Daylily 10"
            : `Daylily ${index + 1}`;
    const price = index === 1 ? "two for $20" : (10 + index).toFixed(2);
    const imageUrl = index === 2 ? "not-an-image-url" : "";
    return `${name},${price},Description ${index + 1},Bed ${index + 1},${imageUrl}`;
  });

  return ["name,price,description,privateNote,imageUrl", ...rows].join("\n");
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

    await page.getByLabel("Price", { exact: true }).click();
    await page.getByRole("option", { name: /^price —/i }).click();
    await page.getByLabel("Image URL", { exact: true }).click();
    await page.getByRole("option", { name: /^imageUrl —/i }).click();

    await expect(
      page.getByRole("heading", { name: "Matches", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Matches" })
        .getByText("20 rows", { exact: true }),
    ).toBeVisible();

    const resultTables = page
      .getByRole("region", { name: "Matches" })
      .locator("table");
    const rowHeights = await resultTables.evaluateAll((tables) =>
      tables.map((table) =>
        Array.from(table.querySelectorAll("tbody tr")).map(
          (row) => row.getBoundingClientRect().height,
        ),
      ),
    );
    expect(rowHeights).toHaveLength(2);
    for (let rowIndex = 0; rowIndex < rowHeights[0]!.length; rowIndex += 1) {
      expect(rowHeights[0]![rowIndex]).toBeGreaterThanOrEqual(80);
      expect(rowHeights[0]![rowIndex]).toBeLessThanOrEqual(81);
      expect(rowHeights[1]![rowIndex]).toBeGreaterThanOrEqual(80);
      expect(rowHeights[1]![rowIndex]).toBeLessThanOrEqual(81);
      expect(
        Math.abs(rowHeights[0]![rowIndex]! - rowHeights[1]![rowIndex]!),
      ).toBeLessThan(1);
    }

    const matchesRegion = page.getByRole("region", { name: "Matches" });
    await expect(
      matchesRegion.getByRole("cell", { name: "Match", exact: true }),
    ).toBeVisible();
    await expect(
      matchesRegion.getByRole("cell", { name: "Issues", exact: true }),
    ).toHaveCount(0);
    await expect(
      matchesRegion.getByRole("cell", { name: "Actions", exact: true }),
    ).toHaveCount(0);
    await expect(matchesRegion.getByText(/^Source:/)).toHaveCount(0);
    await expect(
      matchesRegion.getByRole("button", {
        name: "Review 100% match for Daylily 1",
        exact: true,
      }),
    ).toHaveCSS("--match-hue", "120");

    const issuesRegion = page.getByRole("region", { name: "Issues" });
    await expect(issuesRegion).toContainText("3 issues remaining · 1 of 3");
    await expect(
      issuesRegion.getByRole("heading", { name: "Correct the price" }),
    ).toBeVisible();
    await issuesRegion.getByRole("button", { name: "Next issue" }).click();
    await expect(
      issuesRegion.getByRole("heading", { name: "Correct the image URL" }),
    ).toBeVisible();
    await issuesRegion.getByRole("button", { name: "Next issue" }).click();
    await expect(
      issuesRegion.getByRole("heading", {
        name: "Multiple listings for Daylily 10",
      }),
    ).toBeVisible();
    const duplicateRows = issuesRegion.getByRole("table", {
      name: "Duplicate rows for Daylily 10",
    });
    await expect(duplicateRows.getByRole("row")).toHaveCount(3);
    await expect(
      duplicateRows.getByRole("button", { name: "Remove row 11" }),
    ).toBeVisible();
    await expect(
      duplicateRows.getByRole("button", { name: "Remove row 12" }),
    ).toBeVisible();
    await issuesRegion.getByRole("button", { name: "Keep all" }).click();
    await expect(issuesRegion).toContainText("2 issues remaining · 1 of 2");

    await expect(page.getByPlaceholder("Filter matches…")).toHaveCount(0);
    await expect(
      matchesRegion.getByRole("button", { name: "Table Options" }),
    ).toHaveCount(0);

    const sampleDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download sample" }).click();
    const sampleDownload = await sampleDownloadPromise;
    expect(sampleDownload.suggestedFilename()).toBe(
      "spring-catalog-cleaned.csv",
    );

    await page.getByText("Pro workflow", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Matches", exact: true }),
    ).toBeVisible();
    const proMatches = page.getByRole("region", { name: "Matches" });
    await expect(
      proMatches.getByText("23 rows", { exact: true }),
    ).toBeVisible();

    const correctedPrice = issuesRegion.getByLabel("Correct the price");
    await correctedPrice.fill("12.50");
    await issuesRegion.getByRole("button", { name: "Save price" }).click();
    await expect(issuesRegion).toContainText("2 issues remaining · 1 of 2");

    const correctedImageUrl = issuesRegion.getByLabel("Correct the image URL");
    await correctedImageUrl.fill("https://example.com/daylily.jpg");
    await issuesRegion.getByRole("button", { name: "Save image URL" }).click();
    await expect(issuesRegion).toContainText("1 issue remaining · 1 of 1");
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage
            .getItem("catalog-importer-draft:v1")
            ?.includes("https://example.com/daylily.jpg"),
        ),
      )
      .toBe(true);

    await expect(
      issuesRegion.getByRole("heading", {
        name: "Multiple listings for Daylily 10",
      }),
    ).toBeVisible();
    await issuesRegion.getByRole("button", { name: "Remove row 12" }).click();
    await expect(issuesRegion).toContainText(
      "No spreadsheet issues remaining.",
    );
    await expect(
      proMatches.getByText("22 rows", { exact: true }),
    ).toBeVisible();

    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 1 of 2",
    );
    await page.getByTestId("pager-next").click();
    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 2 of 2",
    );
    await page.getByTestId("pager-prev").click();
    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 1 of 2",
    );

    await proMatches
      .getByRole("button", {
        name: "Review 100% match for Daylily 21",
      })
      .click();
    const matchSheet = page.getByRole("dialog", {
      name: "Change cultivar match",
    });
    await expect(matchSheet).toBeVisible();
    await expect(
      matchSheet.getByRole("table", {
        name: "Uploaded spreadsheet row 22",
      }),
    ).toBeVisible();
    const sheetSearch = matchSheet.getByLabel("Search another cultivar match");
    await sheetSearch.fill("Alternate Bloom");
    await matchSheet.getByRole("button", { name: "Search" }).click();
    await matchSheet
      .getByRole("button", {
        name: "Use match 2: Alternate Bloom",
      })
      .click();
    await expect(matchSheet).not.toBeVisible();
    const changedMatch = proMatches.getByRole("button", {
      name: /Review \d+% match for Daylily 21/,
    });
    await expect(changedMatch).toBeVisible();
    const changedMatchHue = Number(
      await changedMatch.evaluate((element) =>
        element.style.getPropertyValue("--match-hue"),
      ),
    );
    expect(changedMatchHue).toBeLessThan(30);
    await expect(
      proMatches.getByText("Alternate Bloom", { exact: true }),
    ).toBeVisible();
    await expect(
      proMatches.getByRole("button", {
        name: "Review 82% match for Vanguard 2",
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("heading", { name: "Match unmatched names" }),
    ).toBeVisible();
    await expect(
      page.getByText("2 manual matches remaining", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Vanguard 2" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Omit row" })).toHaveCount(0);

    const reviewQuiz = page.getByRole("region", {
      name: "Match unmatched names",
    });
    const sourceRow = reviewQuiz.getByRole("table", {
      name: "Uploaded spreadsheet row 25",
    });
    await expect(
      sourceRow.getByRole("columnheader", { name: /name/ }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("columnheader", { name: /price/ }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("columnheader", { name: /description/ }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("columnheader", { name: /privateNote/ }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("cell", { name: "Vanguard 2", exact: true }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("cell", { name: "33.00", exact: true }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("cell", { name: "Description 24", exact: true }),
    ).toBeVisible();
    await expect(
      sourceRow.getByRole("cell", { name: "Bed 24", exact: true }),
    ).toBeVisible();

    await expect(
      reviewQuiz.getByRole("heading", { name: "Other match" }),
    ).toBeVisible();
    const closeMatchResults = reviewQuiz.getByRole("list", {
      name: "Close match results",
    });
    await expect(closeMatchResults).toBeVisible();
    const closeMatchScroll = await closeMatchResults.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(closeMatchScroll.scrollHeight).toBeGreaterThan(
      closeMatchScroll.clientHeight,
    );

    const otherMatchSearch = reviewQuiz.getByLabel(
      "Search a different cultivar spelling",
    );
    await otherMatchSearch.fill("Alternate Bloom");
    await reviewQuiz.getByRole("button", { name: "Search" }).click();
    await expect(
      reviewQuiz.getByRole("button", {
        name: "Use match 6: Alternate Bloom",
      }),
    ).toBeVisible();
    await expect(
      reviewQuiz.getByRole("button", { name: "Use match 1: Vanguard" }),
    ).toBeVisible();
    const otherMatchResults = reviewQuiz.getByRole("list", {
      name: "Other match results",
    });
    const otherMatchScroll = await otherMatchResults.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(otherMatchScroll.scrollHeight).toBeGreaterThan(
      otherMatchScroll.clientHeight,
    );

    await reviewQuiz.getByRole("button", { name: "Reset" }).click();
    await expect(otherMatchSearch).toHaveValue("Vanguard 2");
    await expect(otherMatchResults).toHaveCount(0);
    await expect(
      reviewQuiz.getByRole("button", { name: "Use match 1: Vanguard" }),
    ).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("heading", { name: "Vanguard 2" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Use match 1: Vanguard" }),
    ).toBeVisible();

    await page.keyboard.press("1");
    await expect(
      page.getByText("1 manual match remaining", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage
            .getItem("catalog-importer-draft:v1")
            ?.includes('"displayName":"Vanguard"'),
        ),
      )
      .toBe(true);
    await page.getByTestId("pager-next").click();
    await expect(page.getByTestId("pager-page-indicator")).toHaveText(
      "Page 2 of 2",
    );
    const linkedVanguard = proMatches.getByRole("button", {
      name: "Review 82% match for Vanguard 2",
    });
    await expect(linkedVanguard).toBeVisible();
    const linkedVanguardHue = Number(
      await linkedVanguard.evaluate((element) =>
        element.style.getPropertyValue("--match-hue"),
      ),
    );
    expect(linkedVanguardHue).toBeGreaterThanOrEqual(50);
    expect(linkedVanguardHue).toBeLessThanOrEqual(60);
    await expect(
      proMatches.getByText("23 rows", { exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Match unmatched names" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 manual match remaining", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Issues" })).toContainText(
      "No spreadsheet issues remaining.",
    );
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Use match 1: Mystery Daylily" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Skip" }).click();
    await expect(
      page.getByRole("heading", { name: "Review complete" }),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(download.suggestedFilename()).toBe("spring-catalog-cleaned.csv");
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath!, "utf8");
    expect(csv).toContain("Mystery Bloom");
    expect(csv).toContain("Vanguard");
    expect(csv).toContain("Daylily 2,12.5");
    expect(csv.split("\r\n")).toHaveLength(25);
  });

  test("keeps the phone layout within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");
    await uploadSample(page, 13);

    await expect(
      page.getByRole("heading", { name: "Matches", exact: true }),
    ).toBeVisible();

    await page.getByText("Pro workflow", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Match unmatched names" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Uploaded spreadsheet row 13" }),
    ).toBeVisible();

    const firstCandidate = page
      .getByRole("list", { name: "Close match results" })
      .getByRole("listitem")
      .first();
    const candidateColumns = await firstCandidate.evaluate((element) => {
      const media = element.querySelector<HTMLElement>(
        '[data-testid="candidate-choice-media"]',
      );
      const details = element.querySelector<HTMLElement>(
        '[data-testid="candidate-choice-details"]',
      );
      if (!media || !details) {
        return null;
      }

      const mediaBounds = media.getBoundingClientRect();
      const detailsBounds = details.getBoundingClientRect();
      return {
        detailsLeft: detailsBounds.left,
        detailsTop: detailsBounds.top,
        mediaLeft: mediaBounds.left,
        mediaTop: mediaBounds.top,
      };
    });
    expect(candidateColumns).not.toBeNull();
    expect(candidateColumns!.detailsLeft).toBeGreaterThan(
      candidateColumns!.mediaLeft,
    );
    expect(
      Math.abs(candidateColumns!.detailsTop - candidateColumns!.mediaTop),
    ).toBeLessThan(2);

    await page
      .getByRole("region", { name: "Matches" })
      .getByRole("button", {
        name: "Review 100% match for Daylily 1",
        exact: true,
      })
      .click();
    const mobileMatchSheet = page.getByRole("dialog", {
      name: "Change cultivar match",
    });
    await expect(mobileMatchSheet).toBeVisible();
    await expect(
      mobileMatchSheet.getByRole("table", {
        name: "Uploaded spreadsheet row 2",
      }),
    ).toBeVisible();
    const mobileSheetBounds = await mobileMatchSheet.boundingBox();
    expect(mobileSheetBounds).not.toBeNull();
    expect(mobileSheetBounds!.x).toBeGreaterThanOrEqual(0);
    expect(mobileSheetBounds!.width).toBeLessThanOrEqual(402);
    await mobileMatchSheet.getByRole("button", { name: "Close" }).click();

    await expect(
      page.getByRole("table", {
        name: "Duplicate rows for Daylily 10",
      }),
    ).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
