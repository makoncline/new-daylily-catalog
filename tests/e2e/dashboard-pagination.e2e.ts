import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb, type E2EPrismaClient } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER, createAuthedUser } from "../../src/lib/test-utils/e2e-users";

const TOTAL_LISTINGS = 135;
const DEFAULT_SIZE = 100;

async function seedListings(db: E2EPrismaClient, userId: string, count: number) {
  const batchSize = 50;
  for (let start = 0; start < count; start += batchSize) {
    const chunk = Array.from({
      length: Math.min(batchSize, count - start),
    }).map((_, offset) => {
      const index = start + offset + 1;
      return db.listing.create({
        data: {
          userId,
          title: `Seed Item ${index}`,
          slug: `seed-item-${index}`,
          description: `Generated listing ${index}`,
          price: index,
        },
      });
    });
    await db.$transaction(chunk);
  }
}

test.describe("dashboard pagination @local", () => {
  test("pagination flow", async ({ page }) => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);
      await seedListings(db, user.id, TOTAL_LISTINGS);
    });

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.goto("/dashboard/listings");

    await expect(page.locator("#data-table")).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("#data-table").getByText(/Seed Item/i).first(),
    ).toBeVisible({ timeout: 10000 });

    const indicator = page.getByTestId("pager-page-indicator");
    const firstBtn = page.getByTestId("pager-first");
    const prevBtn = page.getByTestId("pager-prev");
    const nextBtn = page.getByTestId("pager-next");
    const lastBtn = page.getByTestId("pager-last");
    const perPageSelect = page.getByTestId("pager-per-page");
    const filterBox = page.getByPlaceholder("Filter listings...");

    await test.step("Initial load shows default pagination", async () => {
      await expect(indicator).toBeVisible({ timeout: 5000 });
      await expect(firstBtn).toBeDisabled();
      await expect(prevBtn).toBeDisabled();
      await expect(nextBtn).toBeEnabled();
      await expect(lastBtn).toBeEnabled();
      await expectPage(1, DEFAULT_SIZE);
    });

    await test.step("Navigate forward and backward at default size", async () => {
      await nextBtn.click();
      await expectPage(2, DEFAULT_SIZE);
      await expect(nextBtn).toBeDisabled();
      await expect(lastBtn).toBeDisabled();

      await prevBtn.click();
      await expectPage(1, DEFAULT_SIZE);
      await expect(firstBtn).toBeDisabled();
      await expect(prevBtn).toBeDisabled();

      await lastBtn.click();
      await expectPage(totalPages(DEFAULT_SIZE), DEFAULT_SIZE);

      await firstBtn.click();
      await expectPage(1, DEFAULT_SIZE);
    });

    await test.step("Change page sizes and navigate", async () => {
      const fifty = 50;
      await setPageSize(fifty);
      // Wait for pagination indicator to update with new page size
      await expect(indicator).toContainText(/Page \d+ of \d+/, { timeout: 5000 });
      if (await firstBtn.isEnabled()) {
        await firstBtn.click();
      }
      await expectPage(1, fifty);

      await lastBtn.click();
      await expectPage(totalPages(fifty), fifty);

      const twenty = 20;
      await setPageSize(twenty);
      // Wait for pagination indicator to update with new page size
      await expect(indicator).toContainText(/Page \d+ of \d+/, { timeout: 5000 });
      if (await firstBtn.isEnabled()) {
        await firstBtn.click();
      }
      await expectPage(1, twenty);
    });

    await test.step("Filter narrows down results", async () => {
      await filterBox.fill("Seed Item 12");
      // Wait for filtered results - should show fewer pages (matches ~11 items)
      await expect(indicator).toContainText("Page 1 of 1", { timeout: 5000 });
      await filterBox.clear();
      // Wait for filter to clear - page count should return to full set
      // (page size is 20 from previous step, so 135 items = 7 pages)
      await expect(indicator).toContainText(/Page 1 of [2-9]/, { timeout: 5000 });
    });

    async function expectPage(pageIndex: number, pageSize: number) {
      const expectedTotal = totalPages(pageSize);
      await expect(indicator).toContainText(`Page ${pageIndex} of ${expectedTotal}`);
    }

    async function setPageSize(size: number) {
      await perPageSelect.scrollIntoViewIfNeeded();
      await perPageSelect.click();
      const option = page.getByRole("option", { name: String(size), exact: true });
      await option.waitFor({ state: "visible", timeout: 5000 });
      await option.click();
    }

    function totalPages(pageSize: number) {
      return Math.ceil(TOTAL_LISTINGS / pageSize);
    }
  });

  test("filtering works correctly", async ({ page }) => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);
      await db.listing.createMany({
        data: [
          { userId: user.id, title: "Morning Glory", slug: "morning-glory", description: "Beautiful fragrance" },
          { userId: user.id, title: "Evening Star", slug: "evening-star", description: "Purple blooms" },
          { userId: user.id, title: "Sunshine Delight", slug: "sunshine-delight", description: "Bright yellow" },
        ],
      });
    });

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.goto("/dashboard/listings");

    await expect(page.locator("#data-table")).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("#data-table").getByText(/Morning|Evening|Sunshine/i).first(),
    ).toBeVisible({ timeout: 10000 });

    const filterBox = page.getByPlaceholder("Filter listings...");

    await test.step("Filter by title finds Morning Glory", async () => {
      await filterBox.fill("Morning");
      // Wait for filtered results - either filtered count appears or table updates
      const filteredCount = page.getByTestId("filtered-rows-count");
      await Promise.race([
        filteredCount.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
        expect(page.locator("#data-table").getByText("Morning Glory")).toBeVisible({
          timeout: 5000,
        }),
      ]);
      await expect(page.locator("#data-table").getByText("Morning Glory")).toBeVisible();
      await expect(page.locator("#data-table").getByText("Evening Star")).not.toBeVisible();
    });

    await test.step("Filter by description finds Evening Star", async () => {
      await filterBox.fill("Purple");
      // Wait for filtered results
      const filteredCount = page.getByTestId("filtered-rows-count");
      await Promise.race([
        filteredCount.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
        expect(page.locator("#data-table").getByText("Evening Star")).toBeVisible({
          timeout: 5000,
        }),
      ]);
      await expect(page.locator("#data-table").getByText("Evening Star")).toBeVisible();
      await expect(page.locator("#data-table").getByText("Morning Glory")).not.toBeVisible();
    });

    await test.step("Clear filter shows all listings", async () => {
      await filterBox.clear();
      // Wait for filter to clear - filtered count should disappear or all rows appear
      const filteredCount = page.getByTestId("filtered-rows-count");
      await Promise.race([
        filteredCount.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {}),
        expect(page.locator("#data-table").getByText("Morning Glory")).toBeVisible({
          timeout: 5000,
        }),
      ]);
      await expect(page.locator("#data-table").getByText("Morning Glory")).toBeVisible();
      await expect(page.locator("#data-table").getByText("Evening Star")).toBeVisible();
      await expect(page.locator("#data-table").getByText("Sunshine Delight")).toBeVisible();
    });

    await test.step("No match shows empty state", async () => {
      await filterBox.fill("NONEXISTENT-SEARCH-TERM");
      // Wait for empty state to appear
      await expect(page.getByText("No listings found")).toBeVisible({ timeout: 5000 });
    });
  });
});
