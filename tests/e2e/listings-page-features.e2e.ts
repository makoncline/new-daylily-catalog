import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedListingsPageData,
  type ListingsPageSeedMeta,
} from "./utils/seed-listings-page";

test.describe("listings page features @local", () => {
  let seedMeta: ListingsPageSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedListingsPageData({ db });
    });
  });

  test("user can use listings table search filters sorting row actions and pagination", async ({
    page,
    dashboardListings,
  }) => {
    test.setTimeout(120000);

    const expectUrlParam = async (key: string, expected: string | null) => {
      await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(
        expected,
      );
    };

    const expectBaselineUrlParams = async () => {
      await expectUrlParam("page", null);
      await expectUrlParam("size", null);
      await expectUrlParam("query", null);
      await expectUrlParam("lists", null);
      await expectUrlParam("title", null);
      await expectUrlParam("description", null);
      await expectUrlParam("privateNote", null);
      await expectUrlParam("summary", null);
    };

    const expectFilteredCount = async (filtered: number, total: number) => {
      await expect(dashboardListings.filteredCount()).toHaveText(
        new RegExp(`${filtered}\\s*/\\s*${total}`),
      );
    };

    const expectFirstRowTitle = async (title: string) => {
      await expect.poll(async () => dashboardListings.firstRowTitle()).toBe(
        title,
      );
    };

    const resetAndVerifyBaseline = async () => {
      await dashboardListings.resetToolbarFiltersIfVisible();
      await expect(dashboardListings.filteredCount()).toBeHidden();
      await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(
        seedMeta.defaultPageSize,
      );
      await expect(dashboardListings.pageIndicator()).toHaveText(
        `Page 1 of ${seedMeta.expectedPageCount}`,
      );
      await expectBaselineUrlParams();
    };

    const assertColumnFilterMatch = async (
      columnLabel:
        | "Title"
        | "Description"
        | "Private Notes"
        | "Daylily Database Description",
      urlKey: "title" | "description" | "privateNote" | "summary",
      token: string,
      expectedTitle: string,
    ) => {
      await dashboardListings.openColumnFilter(columnLabel);
      await dashboardListings.setOpenColumnFilterValue(token);

      await expectFilteredCount(1, seedMeta.totalListings);
      await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(1);
      await expect(dashboardListings.listingRow(expectedTitle)).toBeVisible();
      await expectUrlParam(urlKey, JSON.stringify(token));

      await page.keyboard.press("Escape");
      await resetAndVerifyBaseline();
    };

    const assertSortTogglesBetween = async (
      columnLabel: string,
      ascFirstTitle: string,
      descFirstTitle: string,
    ) => {
      let firstToggleTitle = "";

      await dashboardListings.sortByColumn(columnLabel);
      await expect.poll(async () => {
        firstToggleTitle = await dashboardListings.firstRowTitle();
        return (
          firstToggleTitle === ascFirstTitle ||
          firstToggleTitle === descFirstTitle
        );
      }).toBe(true);

      const secondExpectedTitle =
        firstToggleTitle === ascFirstTitle ? descFirstTitle : ascFirstTitle;

      await dashboardListings.sortByColumn(columnLabel);
      await expectFirstRowTitle(secondExpectedTitle);
    };

    // Phase 1: sign in and navigate to listings
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await page.evaluate(() => {
      localStorage.removeItem("table-state-listings-table");
    });

    await dashboardListings.goto();
    await expect(page).toHaveURL(/\/dashboard\/listings/);
    await dashboardListings.isReady();
    await expectBaselineUrlParams();

    // Phase 2: baseline table and pagination behavior
    await expect(dashboardListings.pageIndicator()).toHaveText(
      `Page 1 of ${seedMeta.expectedPageCount}`,
    );
    await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(
      seedMeta.defaultPageSize,
    );

    const firstPageFirstTitle = await dashboardListings.firstRowTitle();

    await dashboardListings.goToNextPage();
    await expect(dashboardListings.pageIndicator()).toHaveText(
      `Page 2 of ${seedMeta.expectedPageCount}`,
    );
    await expectUrlParam("page", "2");
    await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(
      seedMeta.expectedSecondPageRows,
    );

    const secondPageFirstTitle = await dashboardListings.firstRowTitle();
    expect(secondPageFirstTitle).not.toBe(firstPageFirstTitle);

    await dashboardListings.goToPrevPage();
    await expect(dashboardListings.pageIndicator()).toHaveText(
      `Page 1 of ${seedMeta.expectedPageCount}`,
    );
    await expectUrlParam("page", null);

    await dashboardListings.goToLastPage();
    await expect(dashboardListings.pageIndicator()).toHaveText(
      `Page 2 of ${seedMeta.expectedPageCount}`,
    );
    await expectUrlParam("page", "2");

    await dashboardListings.goToFirstPage();
    await expect(dashboardListings.pageIndicator()).toHaveText(
      `Page 1 of ${seedMeta.expectedPageCount}`,
    );
    await expectUrlParam("page", null);

    // Phase 3: global search
    await dashboardListings.setGlobalSearch(seedMeta.globalSearchToken);
    await expectFilteredCount(1, seedMeta.totalListings);
    await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(1);
    await expectUrlParam("query", seedMeta.globalSearchToken);
    await expect(
      dashboardListings.listingRow(seedMeta.globalSearchTitle),
    ).toBeVisible();
    await resetAndVerifyBaseline();

    // Phase 4: lists faceted filter
    await dashboardListings.openListsFilter();
    await dashboardListings.toggleListFilterOption(seedMeta.listFilterLabel);
    await page.keyboard.press("Escape");

    await expectFilteredCount(seedMeta.listFilterCount, seedMeta.totalListings);
    await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(
      seedMeta.listFilterCount,
    );
    await expectUrlParam("lists", seedMeta.listFilterId);
    await expect(
      dashboardListings.listingRow(seedMeta.listFilterRepresentativeTitle),
    ).toBeVisible();

    await dashboardListings.openListsFilter();
    await dashboardListings.clearListsFilterInPopover();
    await page.keyboard.press("Escape");
    await resetAndVerifyBaseline();

    // Phase 5: column filters
    await assertColumnFilterMatch(
      "Title",
      "title",
      seedMeta.titleFilterToken,
      seedMeta.titleFilterTitle,
    );
    await assertColumnFilterMatch(
      "Description",
      "description",
      seedMeta.descriptionFilterToken,
      seedMeta.descriptionFilterTitle,
    );
    await assertColumnFilterMatch(
      "Private Notes",
      "privateNote",
      seedMeta.privateNoteFilterToken,
      seedMeta.privateNoteFilterTitle,
    );
    await assertColumnFilterMatch(
      "Daylily Database Description",
      "summary",
      seedMeta.summaryFilterToken,
      seedMeta.summaryFilterTitle,
    );

    // Phase 6: representative sorting checks
    await dashboardListings.setGlobalSearch(seedMeta.sortToken);
    await expectFilteredCount(3, seedMeta.totalListings);
    await expect.poll(async () => dashboardListings.visibleRowCount()).toBe(3);
    await expectUrlParam("query", seedMeta.sortToken);

    await expectFirstRowTitle(seedMeta.sortExpectations.titleAscFirst);
    await assertSortTogglesBetween(
      "Title",
      seedMeta.sortExpectations.titleAscFirst,
      seedMeta.sortExpectations.titleDescFirst,
    );
    await assertSortTogglesBetween(
      "Price",
      seedMeta.sortExpectations.priceAscFirst,
      seedMeta.sortExpectations.priceDescFirst,
    );
    await assertSortTogglesBetween(
      "Created",
      seedMeta.sortExpectations.createdAscFirst,
      seedMeta.sortExpectations.createdDescFirst,
    );
    await assertSortTogglesBetween(
      "Hybridizer",
      seedMeta.sortExpectations.hybridizerAscFirst,
      seedMeta.sortExpectations.hybridizerDescFirst,
    );

    await resetAndVerifyBaseline();

    // Phase 7: row action delete
    await dashboardListings.setGlobalSearch(seedMeta.deleteTargetTitle);
    await expectFilteredCount(1, seedMeta.totalListings);
    await expectUrlParam("query", seedMeta.deleteTargetTitle);
    await expect(dashboardListings.listingRow(seedMeta.deleteTargetTitle)).toBeVisible();

    await dashboardListings.openFirstVisibleRowActions();
    await dashboardListings.chooseRowActionDelete();
    await dashboardListings.confirmDelete();

    await expect(
      page.getByRole("heading", { name: "No listings found" }),
    ).toBeVisible();
    await expectFilteredCount(0, seedMeta.totalListings - 1);
    await expect(dashboardListings.listingRow(seedMeta.deleteTargetTitle)).toHaveCount(
      0,
    );
  });
});
