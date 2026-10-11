import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../src/lib/test-utils/e2e-users";
import { signInTestUser } from "./utils/auth";
import { setStripeSubscriptionStatus } from "./utils/stripe";
import type { Page } from "@playwright/test";
import { expect, previewTest as test } from "../../e2e/test-setup";
import { readFile } from "node:fs/promises";
import { mockCultivarMatches } from "./utils/catalog-importer";

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
  test("centers the importer content on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog-importer");

    await expect(page.getByRole("main")).toHaveCount(1);
    const container = await page
      .locator('[data-slot="catalog-importer-page-container"]')
      .boundingBox();
    expect(container).not.toBeNull();
    expect(container!.width).toBeGreaterThan(1000);
    expect(container!.width).toBeLessThanOrEqual(1024);
    expect(Math.abs(container!.x - (1280 - container!.width) / 2)).toBeLessThan(
      2,
    );
  });

  test("prepares, restores, and downloads a spreadsheet", async ({ page }) => {
    test.slow();
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");

    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("heading", {
        name: "Turn the catalog you already have into one buyers can browse",
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
      page.getByText("A nonnegative number. Currency symbols are cleaned."),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "About Price" }).click();
    await expect(page.getByRole("tooltip")).toContainText(
      "A nonnegative number. Currency symbols are cleaned.",
    );
    await page.keyboard.press("Escape");

    await page.getByLabel("Price", { exact: true }).click();
    await page.getByRole("option", { name: /^price —/i }).click();
    await page.getByLabel("Private note", { exact: true }).click();
    await page.getByRole("option", { name: /^privateNote —/i }).click();
    await expect(
      page.getByRole("region", {
        name: "Catalog preview ready",
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    await expect(
      page.getByRole("heading", { name: "Matches", exact: true }),
    ).toHaveCount(0);
    const catalogSummary = page.getByRole("region", {
      name: "Catalog preview ready",
    });
    await expect(
      catalogSummary.getByRole("heading", {
        name: /We matched 23 listings/,
      }),
    ).toBeVisible();
    await expect(
      catalogSummary.getByTestId("pending-decision-count"),
    ).toHaveText("2");
    await expect(catalogSummary.getByTestId("issue-count")).toHaveText("3");
    await expect(page.getByText("100%", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "View details for Daylily 1",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Reference photo", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Publish this catalog with Pro",
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("Give buyers one public link", {
        exact: false,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Issues 0/3" }).click();

    const issuesRegion = page.getByRole("region", {
      name: "Review spreadsheet data",
    });
    await expect(issuesRegion).toContainText("0 of 3 completed");
    await expect(
      issuesRegion.getByRole("heading", {
        name: "Price formats need review",
      }),
    ).toBeVisible();
    await expect(
      issuesRegion.getByRole("heading", {
        name: "Seller images need review",
      }),
    ).toHaveCount(0);
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
        name: "Exclude row 11 from workbook",
      }),
    ).toBeVisible();
    await expect(
      duplicateRows.getByRole("button", {
        name: "Exclude row 12 from workbook",
      }),
    ).toBeVisible();
    await expect(
      issuesRegion.getByRole("button", { name: "Keep both listings" }),
    ).toHaveCount(0);

    const priceIssues = issuesRegion.getByRole("region", {
      name: "Price formats need review",
    });
    await priceIssues.getByLabel("Correct price for row 3").fill("12");
    await priceIssues.getByLabel("Correct price for row 5").fill("14");
    await priceIssues.getByRole("button", { name: "Save all" }).click();
    await expect(issuesRegion).toContainText("2 of 3 completed");
    await expect(
      page.getByRole("button", { name: "Issues 2/3" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Review 0/2" }).click();
    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(
      page.getByText("0 of 2 completed", { exact: true }),
    ).toBeVisible();

    const reviewQuiz = page.getByRole("region", {
      name: "Review potential matches",
    });
    await expect(
      reviewQuiz.getByText("Vanguard 2", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Omit row" })).toHaveCount(0);

    const sourceRow = reviewQuiz.getByRole("region", {
      name: "Uploaded spreadsheet row 25",
    });
    await expect(sourceRow).toBeVisible();
    await expect(
      reviewQuiz.getByRole("button", { name: "Use match 1: Vanguard" }),
    ).toBeVisible();

    await reviewQuiz.focus();
    await page.keyboard.press("1");
    await expect(
      page.locator(
        '[aria-live="polite"][aria-label="Catalog importer updates"]',
      ),
    ).toContainText("Vanguard 2 matched to Vanguard. Moving to Mystery Bloom.");
    await expect(
      page.getByRole("button", { name: "Reset review for Vanguard 2" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 of 2 completed", { exact: true }),
    ).toBeVisible();
    await expect(
      reviewQuiz.getByText("Mystery Bloom", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        JSON.stringify(await readSavedDraft(page)).includes(
          '"displayName":"Vanguard"',
        ),
      )
      .toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Review 1/2" }).click();
    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(
      page.getByText("1 of 2 completed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Issues 2/3" }),
    ).toBeVisible();

    const restoredReviewQuiz = page.getByRole("region", {
      name: "Review potential matches",
    });
    await expect(
      restoredReviewQuiz.getByText("Mystery Bloom", { exact: true }),
    ).toBeVisible();
    await expect(
      restoredReviewQuiz.getByRole("button", {
        name: "Use match 1: Mystery Daylily",
      }),
    ).toBeVisible();
    await expect(
      restoredReviewQuiz.getByRole("button", { name: "Decide later" }),
    ).toHaveCount(0);
    await expect(
      restoredReviewQuiz.getByText("Search another cultivar", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      restoredReviewQuiz.getByRole("button", { name: "Leave unmatched" }),
    ).toHaveAttribute("aria-keyshortcuts", "U");
    await expect(
      restoredReviewQuiz.getByRole("button", { name: "Exclude from catalog" }),
    ).toHaveAttribute("aria-keyshortcuts", "X");
    await expect(restoredReviewQuiz).toBeFocused();
    await page.keyboard.press("x");
    await expect(
      page.getByRole("region", { name: "Review potential matches" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Finish" }).click();
    const importSummary = page.getByRole("region", {
      name: "23 listings ready",
    });
    await expect(importSummary).toContainText("24 matched");
    await expect(importSummary).toContainText("1 excluded");
    await expect(importSummary).toContainText("1 need review");
    await expect(
      importSummary.getByRole("heading", {
        name: "Publish your catalog",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Downloads contain values", {
        exact: false,
      }),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download enhanced original" })
      .click();
    await page
      .getByRole("alertdialog", {
        name: "Download before review is complete?",
      })
      .getByRole("button", { name: "Download anyway" })
      .click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(download.suggestedFilename()).toBe(
      "spring-catalog-enhanced-original.csv",
    );
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath, "utf8");
    expect(csv.split("\r\n")[0]).toBe(
      "Name,Price,Description,Private Note,imageUrl,Daylily Catalog ID,Daylily Catalog Cultivar Name,Daylily Catalog Cultivar URL",
    );
    expect(csv).toContain("Mystery Bloom");
    expect(csv).toContain(
      "cultivar-vanguard,Vanguard,https://daylilycatalog.com/cultivar/vanguard",
    );
    expect(csv).not.toContain("Vanguard 2");
    expect(csv).toContain("Daylily 2,12");
    expect(csv).not.toContain("two for $20");
    expect(csv).not.toContain("three for $30");
    expect(csv.split("\r\n")).toHaveLength(26);
  });

  test("loads a sample catalog without a spreadsheet", async ({ page }) => {
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");

    await page.getByRole("button", { name: "Use sample catalog" }).click();
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    const summary = page.getByRole("region", {
      name: "Catalog preview ready",
    });
    await expect(
      summary.getByRole("heading", { name: /We matched 9 listings/ }),
    ).toBeVisible();
    await expect(summary.getByTestId("pending-decision-count")).toHaveText("1");
    await expect(summary.getByTestId("issue-count")).toHaveText("2");
    await page.getByRole("button", { name: "Issues 0/2" }).click();
    await expect(
      page.getByRole("region", { name: "Review spreadsheet data" }),
    ).toContainText("0 of 2 completed");
  });

  test("keeps the phone layout within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await mockCultivarMatches(page);
    await page.goto("/catalog-importer");
    await uploadSample(page, 13);
    for (const [label, option] of [
      ["Price", /^price —/i],
      ["Private note", /^privateNote —/i],
    ] as const) {
      await page.getByLabel(label, { exact: true }).click();
      await page.getByRole("option", { name: option }).click();
    }
    await page.getByRole("button", { name: "Build catalog preview" }).click();

    await expect(
      page.getByRole("region", {
        name: "Catalog preview ready",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: /^Review 0\/\d+$/ }).click();
    await expect(
      page.getByRole("heading", { name: "Review potential matches" }),
    ).toBeVisible();
    await expect(page.getByLabel("Uploaded spreadsheet row 13")).toBeVisible();
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

    await page.getByRole("button", { name: "Issues 0/3" }).click();
    await expect(
      page.getByRole("table", {
        name: "Duplicate rows for Daylily 10",
      }),
    ).toBeVisible();
    const mobileActions = page.getByRole("navigation", {
      name: "Catalog importer steps",
    });
    await expect(mobileActions).toBeVisible();

    for (const control of [
      page.getByLabel("Correct price for row 3"),
      page.getByRole("button", { name: "Save price for row 3" }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(402);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }

    await mobileActions.getByRole("button", { name: "Finish" }).click();
    await expect(
      page.getByRole("button", {
        name: "Download prepared import file",
      }),
    ).toBeVisible();
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
    await expect(mobileActions).toBeVisible();
    const tabletOverflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(tabletOverflow.scrollWidth).toBeLessThanOrEqual(
      tabletOverflow.clientWidth,
    );
  });
});

test("temp spreadsheet becomes a named list with its original values @local", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(30_000);
  await withTempE2EDb(async (db) => {
    const user = await createAuthedUser(db);
    await setStripeSubscriptionStatus({
      db,
      stripeCustomerId: user.stripeCustomerId!,
    });
    await signInTestUser(page);
    const listings = [
      {
        id: "roundtrip-one",
        name: "Seedling - 2",
        price: 15.5,
        description: "Peach blooms\nReady to divide",
        privateNote: "East garden\nRow 2",
        cultivarReferenceId: null,
      },
      {
        id: "roundtrip-two",
        name: "2026",
        price: 0,
        description: "",
        privateNote: "",
        cultivarReferenceId: null,
      },
    ];
    await page.goto("/temp-list");
    await page.evaluate(
      (rows) =>
        localStorage.setItem("daylily-catalog:temp-list", JSON.stringify(rows)),
      listings,
    );
    await page.reload();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download spreadsheet", exact: true })
      .click();
    const file = await download;
    const filePath = await file.path();
    if (!filePath) throw new Error("Expected a downloaded spreadsheet.");
    await page
      .getByRole("link", { name: "Open importer", exact: true })
      .click();
    await page.locator('input[type="file"]').setInputFiles({
      name: file.suggestedFilename(),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await readFile(filePath),
    });
    await page
      .getByRole("button", { name: "Build catalog preview", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "2 listings are ready without cultivar links",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await page
      .getByRole("link", { name: "Continue to import", exact: true })
      .click();
    const title = `Club sale ${Date.now()}`;
    await page
      .getByLabel("Save together in a named list (optional)")
      .fill(title);
    await page
      .getByRole("button", { name: "Import 2 listings", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText(title);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await db.list.count({ where: { title } })).toBe(0);
    await page.reload();
    await expect(
      page.getByLabel("Save together in a named list (optional)"),
    ).toHaveValue(title);
    await page
      .getByRole("button", { name: "Import 2 listings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "View saved list", exact: true }),
    ).toBeVisible();
    const saved = await db.list.findFirstOrThrow({
      where: { title },
      include: { listings: true },
    });
    expect(saved.listings).toHaveLength(2);
    for (const row of listings) {
      expect(
        saved.listings.find((listing) => listing.title === row.name),
      ).toMatchObject({
        price: row.price,
        description: row.description || null,
        privateNote: row.privateNote || null,
        cultivarReferenceId: null,
      });
    }
    await page.reload();
    await expect(
      page.getByRole("link", { name: "View saved list", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Save together in a named list (optional)"),
    ).toBeDisabled();
    const futureVersion = new Date(Date.now() + 60_000);
    await db.list.update({
      where: { id: saved.id },
      data: { updatedAt: futureVersion },
    });
    // Reloading can offer exact existing rows again. The same import must remain idempotent.
    await page
      .getByRole("button", { name: "Import 2 listings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Import 2 listings", exact: true }),
    ).toHaveCount(0);
    expect(await db.list.count({ where: { title } })).toBe(1);
    const retried = await db.list.findUniqueOrThrow({
      where: { id: saved.id },
    });
    expect(retried.updatedAt.getTime()).toBeGreaterThan(
      futureVersion.getTime(),
    );
    expect(
      await db.listing.count({ where: { lists: { some: { id: saved.id } } } }),
    ).toBe(2);
    await page
      .getByRole("link", { name: "Return to import builder", exact: true })
      .click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    await page.locator('input[type="file"]').setInputFiles({
      name: file.suggestedFilename(),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await readFile(filePath),
    });
    await page
      .getByRole("button", { name: "Build catalog preview", exact: true })
      .click();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await page
      .getByRole("link", { name: "Continue to import", exact: true })
      .click();
    const newListTitle = page.getByLabel(
      "Save together in a named list (optional)",
    );
    await expect(newListTitle).toHaveValue("");
    await expect(newListTitle).toBeEnabled();
    await newListTitle.fill(`${title} next event`);
    await page
      .getByRole("button", { name: "Import 2 listings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "View saved list", exact: true }),
    ).toBeVisible();
    const nextList = await db.list.findFirstOrThrow({
      where: { title: `${title} next event` },
      include: { listings: true },
    });
    expect(nextList.id).not.toBe(saved.id);
    expect(nextList.listings.map((row) => row.id).sort()).toEqual(
      saved.listings.map((row) => row.id).sort(),
    );
    await db.list.deleteMany({
      where: { id: { in: [saved.id, nextList.id] } },
    });
    await db.listing.deleteMany({
      where: {
        id: {
          in: saved.listings
            .filter((row) => row.importKey !== null)
            .map((row) => row.id),
        },
      },
    });
  });
});
