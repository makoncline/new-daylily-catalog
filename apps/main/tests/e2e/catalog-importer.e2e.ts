import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

interface MatchRequest {
  names: string[];
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

async function readSavedDraft(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const request = indexedDB.open("keyval-store");
        request.onerror = () =>
          reject(request.error ?? new Error("Could not open the saved draft."));
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("keyval", "readonly");
          const getRequest = transaction
            .objectStore("keyval")
            .get("catalog-importer-draft:v2");
          getRequest.onerror = () =>
            reject(
              getRequest.error ?? new Error("Could not read the saved draft."),
            );
          getRequest.onsuccess = () =>
            resolve(
              (getRequest.result as Record<string, unknown> | undefined) ??
                null,
            );
        };
      }),
  );
}

function candidate(name: string, confidence: number) {
  const normalizedName = normalizeName(name);
  const featuredFacetValues = normalizedName === "daylily 1";

  return {
    awardNames: featuredFacetValues ? "Stout Medal" : "Honorable Mention",
    bloomHabit: "Reblooms",
    bloomSizeIn: 5,
    bloomSeason: "Midseason",
    branches: 4,
    budCount: 18,
    color: "Golden yellow with a deep raspberry eye and matching picotee edge",
    confidence,
    cultivarReferenceId: `cultivar-${normalizedName}`,
    displayName: name,
    foliageType: "Dormant",
    flowerShow: featuredFacetValues ? "Large" : "Small",
    form: "Single, unusual form cascade",
    fragrance: "Fragrant",
    hybridizer: featuredFacetValues
      ? "Featured Hybridizer"
      : "Example Hybridizer",
    imageAsset: {
      blurUrl: "https://media.example.com/blur-20.webp",
      displayUrl: "https://media.example.com/display-800.webp",
      id: `image-${normalizedName}`,
      originalUrl: "https://media.example.com/original.jpg",
      status: "READY",
      thumbUrl: "https://media.example.com/thumb-200.webp",
    },
    imageUrl: "https://media.example.com/original.jpg",
    listingCount: 0,
    normalizedName,
    parentage: "Seedling x Example Parent",
    ploidy: "Diploid",
    rebloom: true,
    scapeHeightIn: 24,
    sculptedTypes: featuredFacetValues ? "Pleated" : "Relief",
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
    const price =
      index === 1
        ? "two for $20"
        : index === 3
          ? "three for $30"
          : (10 + index).toFixed(2);
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
  test("prepares, restores, and downloads a spreadsheet", async ({ page }) => {
    test.slow();
    await mockCultivarMatches(page);
    await page.route("https://example.com/daylily.jpg", async (route) => {
      await route.fulfill({
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
        contentType: "image/png",
        status: 200,
      });
    });
    await page.goto("/catalog-importer");

    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("heading", {
        name: "Turn your daylily spreadsheet into a catalog-ready collection",
      }),
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
      page.getByRole("button", { name: "Replace spreadsheet" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Clear local progress" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Cultivar reference ID", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "A number such as 12 or 12.50. Currency symbols are cleaned.",
      ),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "About Price" }).click();
    await expect(page.getByRole("tooltip")).toContainText(
      "A number such as 12 or 12.50. Currency symbols are cleaned.",
    );
    await page.keyboard.press("Escape");

    await page.getByLabel("Price", { exact: true }).click();
    await page.getByRole("option", { name: /^price —/i }).click();
    await page.getByLabel("Private note", { exact: true }).click();
    await page.getByRole("option", { name: /^privateNote —/i }).click();
    await page.getByLabel("Image URL", { exact: true }).click();
    await page.getByRole("option", { name: /^imageUrl —/i }).click();
    await expect(
      page.getByRole("region", {
        name: "Your private catalog preview is ready",
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    await expect(
      page.getByRole("heading", { name: "Matches", exact: true }),
    ).toHaveCount(0);
    const catalogSummary = page.getByRole("region", {
      name: "Your private catalog preview is ready",
    });
    await expect(catalogSummary.getByTestId("source-row-count")).toHaveText(
      "26",
    );
    await expect(
      catalogSummary.getByTestId("detected-listing-count"),
    ).toHaveText("25");
    await expect(catalogSummary.getByTestId("linked-listing-count")).toHaveText(
      "23",
    );
    await expect(
      catalogSummary.getByTestId("unique-cultivar-count"),
    ).toHaveText("22");
    await expect(
      catalogSummary.getByTestId("pending-decision-count"),
    ).toHaveText("2");
    await expect(page.getByText("100%", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Change cultivar match for Daylily 1",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Reference photo", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Imagine this as your public catalog",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Direct spreadsheet import is not available yet.", {
        exact: false,
      }),
    ).toBeVisible();

    const issuesRegion = page.getByRole("region", {
      name: "Fix spreadsheet issues",
    });
    await expect(issuesRegion).toContainText("4 issues remaining");
    await expect(
      issuesRegion.getByRole("heading", {
        name: "Price formats need review",
      }),
    ).toBeVisible();
    await expect(
      issuesRegion.getByRole("heading", {
        name: "Seller images need review",
      }),
    ).toBeVisible();
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
      duplicateRows.getByRole("button", {
        name: "Remove row 11 from prepared workbook",
      }),
    ).toBeVisible();
    await expect(
      duplicateRows.getByRole("button", {
        name: "Remove row 12 from prepared workbook",
      }),
    ).toBeVisible();
    await issuesRegion
      .getByRole("button", { name: "Keep both listings" })
      .click();
    await expect(issuesRegion).toContainText("3 issues remaining");
    await page
      .getByRole("button", { name: "Undo spreadsheet issue change" })
      .click();
    await expect(issuesRegion).toContainText("4 issues remaining");
    await issuesRegion
      .getByRole("button", { name: "Keep both listings" })
      .click();
    await expect(issuesRegion).toContainText("3 issues remaining");

    const priceIssues = issuesRegion.getByRole("region", {
      name: "Price formats need review",
    });
    await priceIssues.getByLabel("Correct price for row 3").fill("12.50");
    await priceIssues.getByLabel("Correct price for row 5").fill("13.50");
    await priceIssues.getByRole("button", { name: "Save all" }).click();
    await expect(issuesRegion).toContainText("1 issue remaining");

    const imageIssues = issuesRegion.getByRole("region", {
      name: "Seller images need review",
    });
    const correctedImageUrl = imageIssues.getByLabel(
      "Correct image URL for row 4",
    );
    await correctedImageUrl.fill("https://example.com/daylily.jpg");
    await imageIssues
      .getByRole("button", { name: "Save image URL for row 4" })
      .click();
    await expect(
      page.getByRole("region", { name: "Fix spreadsheet issues" }),
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        JSON.stringify(await readSavedDraft(page)).includes(
          "https://example.com/daylily.jpg",
        ),
      )
      .toBe(true);

    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(
      page.getByText("2 manual matches remaining", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Vanguard 2" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Omit row" })).toHaveCount(0);

    const reviewQuiz = page.getByRole("region", {
      name: "Review potential matches",
    });
    const sourceRow = reviewQuiz.getByRole("table", {
      name: "Uploaded spreadsheet row 25",
    });
    await expect(sourceRow).toBeVisible();
    await expect(
      reviewQuiz.getByRole("button", { name: "Use match 1: Vanguard" }),
    ).toBeVisible();

    await reviewQuiz.focus();
    await page.keyboard.press("1");
    await expect(
      page.getByText("Vanguard was added to your preview."),
    ).toBeVisible();
    await expect(
      page.locator(
        '[aria-live="polite"][aria-label="Catalog importer updates"]',
      ),
    ).toContainText("Vanguard 2 matched to Vanguard. Moving to Mystery Bloom.");
    await expect(
      page.getByRole("link", { name: "View in preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Undo identity decision" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 manual match remaining", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        JSON.stringify(await readSavedDraft(page)).includes(
          '"displayName":"Vanguard"',
        ),
      )
      .toBe(true);
    await expect(catalogSummary.getByTestId("linked-listing-count")).toHaveText(
      "24",
    );

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 manual match remaining", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Fix spreadsheet issues" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Use match 1: Mystery Daylily" }),
    ).toBeVisible();

    const closeMatches = page.getByRole("region", { name: "Close matches" });
    await expect(
      closeMatches.getByRole("button", { name: "Decide later" }),
    ).toHaveAttribute("aria-keyshortcuts", "X");
    const restoredReviewQuiz = page.getByRole("region", {
      name: "Review potential matches",
    });
    const reviewSearch = restoredReviewQuiz.getByLabel(
      "Search a different cultivar spelling",
    );
    await reviewSearch.focus();
    await page.keyboard.press("x");
    await expect(
      page.getByRole("heading", { name: "Mystery Bloom" }),
    ).toBeVisible();
    await expect(reviewSearch).toHaveValue("x");
    await restoredReviewQuiz.getByRole("button", { name: "Reset" }).click();
    await expect(reviewSearch).toHaveValue("Mystery Bloom");
    await restoredReviewQuiz.focus();
    await page.keyboard.press("x");
    await expect(
      page.getByRole("region", { name: "Review potential matches" }),
    ).toContainText("1 manual match remaining");
    await closeMatches.getByRole("button", { name: "Leave unmatched" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("region", { name: "Review potential matches" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Listings left unmatched" }),
    ).toContainText("Mystery Bloom");

    const downloadSummary = page.getByRole("region", {
      name: "Prepared workbook contents",
    });
    await expect(downloadSummary).toContainText(
      "Retain 26 source rows in one CSV table",
    );
    await expect(downloadSummary).toContainText(
      "Include 3 seller-approved corrections",
    );
    await expect(downloadSummary).toContainText(
      "Add Daylily Catalog identity to 24 linked listings",
    );
    await expect(downloadSummary).toContainText(
      "Keep 1 intentionally unmatched listing",
    );
    await expect(downloadSummary).toContainText(
      "Leave 0 cultivar decisions, 0 required values, and 0 warnings unresolved",
    );
    await expect(
      page.getByRole("heading", {
        name: "Your workbook is ready. Want a hosted catalog?",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("it is not imported or published automatically", {
        exact: false,
      }),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("region", { name: "Your prepared workbook is ready" })
      .getByRole("button", { name: "Download prepared workbook" })
      .click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(download.suggestedFilename()).toBe(
      "spring-catalog-daylily-catalog-prepared.csv",
    );
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath, "utf8");
    expect(csv.split("\r\n")[0]).toBe(
      "name,price,description,privateNote,imageUrl,Daylily Catalog ID,Daylily Catalog Cultivar Name,Daylily Catalog Cultivar URL",
    );
    expect(csv).toContain("Mystery Bloom");
    expect(csv).toContain(
      "cultivar-vanguard,Vanguard,https://daylilycatalog.com/cultivar/vanguard",
    );
    expect(csv).not.toContain("Vanguard 2");
    expect(csv).toContain("Daylily 2,12.5");
    expect(csv).toContain("Original price: two for $20");
    expect(csv).toContain("Original price: three for $30");
    expect(csv.split("\r\n")).toHaveLength(26);
  });

  test("loads a sample catalog without a spreadsheet", async ({ page }) => {
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");

    await page.getByRole("button", { name: "Use sample catalog" }).click();
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    await expect(
      page.getByText("Sample daylily catalog.csv", { exact: true }),
    ).toBeVisible();
    const summary = page.getByRole("region", {
      name: "Your private catalog preview is ready",
    });
    await expect(summary.getByTestId("source-row-count")).toHaveText("11");
    await expect(summary.getByTestId("detected-listing-count")).toHaveText(
      "10",
    );
    await expect(summary.getByTestId("linked-listing-count")).toHaveText("9");
    await expect(summary.getByTestId("unique-cultivar-count")).toHaveText("8");
    await expect(summary.getByTestId("pending-decision-count")).toHaveText("1");
    await expect(
      page.getByRole("region", { name: "Fix spreadsheet issues" }),
    ).toContainText("2 issues remaining");
  });

  test("keeps the phone layout within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");
    await uploadSample(page, 13);
    for (const [label, option] of [
      ["Price", /^price —/i],
      ["Private note", /^privateNote —/i],
      ["Image URL", /^imageUrl —/i],
    ] as const) {
      await page.getByLabel(label, { exact: true }).click();
      await page.getByRole("option", { name: option }).click();
    }
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Your private catalog preview is ready",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Uploaded spreadsheet row 13" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Preview Vanguard reference photo",
      }),
    ).toBeVisible();

    const candidateMedia = page.getByTestId("candidate-choice-media").first();
    const candidateDetails = page
      .getByTestId("candidate-choice-details")
      .first();
    const [candidateMediaBox, candidateDetailsBox] = await Promise.all([
      candidateMedia.boundingBox(),
      candidateDetails.boundingBox(),
    ]);
    expect(candidateMediaBox).not.toBeNull();
    expect(candidateDetailsBox).not.toBeNull();
    expect(candidateMediaBox!.x + candidateMediaBox!.width).toBeLessThanOrEqual(
      candidateDetailsBox!.x,
    );

    await expect(
      page.getByRole("table", {
        name: "Duplicate rows for Daylily 10",
      }),
    ).toBeVisible();
    const mobileActions = page.getByRole("navigation", {
      name: "Catalog preparation actions",
    });
    await expect(mobileActions).toBeVisible();
    const mobileActionsBox = await mobileActions.boundingBox();
    expect(mobileActionsBox).not.toBeNull();

    for (const control of [
      page.getByLabel("Correct price for row 3"),
      page.getByRole("button", { name: "Save price for row 3" }),
      page.getByLabel("Correct image URL for row 4"),
      page.getByRole("button", { name: "Save image URL for row 4" }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(402);
      expect(box!.y + box!.height).toBeLessThanOrEqual(mobileActionsBox!.y);
    }

    await expect(
      mobileActions.getByRole("button", {
        name: "Download current workbook",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", {
        name: "Catalog preparation workspace",
      }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Return to top" }),
    ).toBeHidden();
    await expect(
      page.locator(
        '[aria-live="polite"][aria-label="Catalog importer updates"]',
      ),
    ).toHaveCount(1);

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(mobileActions).toBeHidden();
    await expect(
      page.getByRole("navigation", {
        name: "Catalog preparation workspace",
      }),
    ).toBeVisible();
    const tabletOverflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(tabletOverflow.scrollWidth).toBeLessThanOrEqual(
      tabletOverflow.clientWidth,
    );
  });
});
