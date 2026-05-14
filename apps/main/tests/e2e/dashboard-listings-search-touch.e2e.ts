import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedListingsPageData,
  type ListingsPageSeedMeta,
} from "./utils/seed-listings-page";

test.describe("dashboard listings search touch interactions @local", () => {
  test.use({
    hasTouch: true,
    isMobile: false,
    viewport: { width: 1024, height: 1366 },
  });

  let seedMeta: ListingsPageSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedListingsPageData({ db });
    });
  });

  test("iPad-sized touch input can operate search controls", async ({
    page,
    dashboardListings,
  }) => {
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await page.evaluate(() => {
      localStorage.removeItem("dashboard-listings-search-collapsed");
      localStorage.removeItem("dashboard-listings-search-mode");
      localStorage.removeItem("table-state-listings-table:v1");
    });

    await dashboardListings.goto();
    await dashboardListings.isReady();
    await expect(page.getByTestId("listing-table")).toBeVisible();

    await page.getByTestId("search-collapse-toggle").tap();
    await expect(page.getByTestId("search-all-fields-input")).toBeHidden();

    await page.getByTestId("search-collapse-toggle").tap();
    await expect(page.getByTestId("search-all-fields-input")).toBeVisible();

    await page.getByTestId("search-mode-switch").tap();
    await expect(page.getByTestId("advanced-filter-title")).toBeVisible();

    const activeChips = page.getByTestId("active-filter-chips");

    await page.getByTestId("advanced-filter-for-sale").tap();
    await expect(
      activeChips.getByRole("button", { name: "For Sale" }),
    ).toBeVisible();

    await page.getByTestId("advanced-filter-has-photo").tap();
    await expect(
      activeChips.getByRole("button", { name: "Has Photo" }),
    ).toBeVisible();

    await page
      .getByTestId("search-all-fields-input")
      .fill(seedMeta.globalSearchToken);
    await expect(
      activeChips.getByRole("button", {
        name: new RegExp(`search:\\s*${seedMeta.globalSearchToken}`, "i"),
      }),
    ).toBeVisible();

    await activeChips.getByRole("button", { name: "Has Photo" }).tap();
    await expect(
      activeChips.getByRole("button", { name: "Has Photo" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /reset/i }).tap();
    await expect(activeChips.getByRole("button")).toHaveCount(0);
    await expect(page.getByTestId("search-all-fields-input")).toHaveValue("");
  });
});
