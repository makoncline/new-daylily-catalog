import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedManageListPageData,
  type ManageListPageSeedMeta,
} from "./utils/seed-manage-list-page";

test.describe("manage list page features @local", () => {
  let seedMeta: ManageListPageSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedManageListPageData({ db });
    });
  });

  test("user can use manage list form add listings and table features", async ({
    page,
    manageListPage,
  }) => {
    test.setTimeout(180000);

    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    const expectUrlParam = async (key: string, expected: string | null) => {
      await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(
        expected,
      );
    };

    const expectBaselineUrlParams = async () => {
      await expectUrlParam("page", null);
      await expectUrlParam("size", null);
      await expectUrlParam("query", null);
      await expectUrlParam("title", null);
    };

    const expectPageIndicator = async (currentPage: number, totalPages: number) => {
      await expect(manageListPage.pageIndicator()).toHaveText(
        `Page ${currentPage} of ${totalPages}`,
      );
    };

    const expectFirstRowTitle = async (title: string) => {
      await expect.poll(async () => manageListPage.firstRowTitle()).toBe(title);
    };

    const assertSortTogglesBetween = async (
      columnLabel: string,
      ascFirstTitle: string,
      descFirstTitle: string,
    ) => {
      let firstToggleTitle = "";

      await manageListPage.sortByColumn(columnLabel);
      await expect.poll(async () => {
        firstToggleTitle = await manageListPage.firstRowTitle();
        return (
          firstToggleTitle === ascFirstTitle ||
          firstToggleTitle === descFirstTitle
        );
      }).toBe(true);

      const oppositeExpectedTitle =
        firstToggleTitle === ascFirstTitle ? descFirstTitle : ascFirstTitle;

      for (let attempt = 0; attempt < 2; attempt++) {
        await manageListPage.sortByColumn(columnLabel);
        try {
          await expectFirstRowTitle(oppositeExpectedTitle);
          return;
        } catch {
          // Some table headers can cycle through an intermediate unsorted state.
        }
      }

      await expectFirstRowTitle(oppositeExpectedTitle);
    };

    // Phase 1: sign in and navigate to manage list page
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.evaluate(() => {
      localStorage.removeItem("table-state-list-listings-table");
    });

    await manageListPage.goto(seedMeta.listId);
    await manageListPage.isReady();
    await expect(page).toHaveURL(new RegExp(`/dashboard/lists/${seedMeta.listId}`));
    await expectBaselineUrlParams();

    // Phase 2: list form edit + persistence
    await manageListPage.fillTitle(seedMeta.updatedListTitle);
    await manageListPage.fillDescription(seedMeta.updatedListDescription);
    await manageListPage.saveChangesAndWait();

    // Phase 3: baseline table + pagination
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(
      seedMeta.defaultPageSize,
    );
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    await manageListPage.goToNextPage();
    await expectPageIndicator(2, seedMeta.expectedPageCountBeforeAdd);
    await expectUrlParam("page", "2");
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(
      seedMeta.expectedSecondPageRowsBeforeAdd,
    );

    await manageListPage.goToFirstPage();
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);
    await expectUrlParam("page", null);

    await manageListPage.setRowsPerPage(60);
    await expectUrlParam("size", "60");
    await expectPageIndicator(1, 2);
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(60);

    await page.evaluate(() => {
      localStorage.removeItem("table-state-list-listings-table");
    });
    await manageListPage.goto(seedMeta.listId);
    await manageListPage.isReady();
    await expectBaselineUrlParams();
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    // Phase 4: add listing flow
    await manageListPage.openAddListingsDialog();
    await manageListPage.searchAddListings(seedMeta.addableListingToken);
    await manageListPage.selectListingToAdd(seedMeta.addableListingTitle);
    await expect(toast("Listing added to list")).toBeVisible({ timeout: 10000 });

    await manageListPage.setGlobalSearch(seedMeta.addableListingTitle);
    await expectUrlParam("query", seedMeta.addableListingTitle);
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(1);
    await expect(manageListPage.listingRow(seedMeta.addableListingTitle)).toBeVisible();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`1\\s*/\\s*${seedMeta.totalListListingsAfterAdd}`),
    );

    await manageListPage.resetToolbarFiltersIfVisible();
    await expectBaselineUrlParams();
    await expectPageIndicator(1, seedMeta.expectedPageCountAfterAdd);

    // Phase 5: column filter + sorting checks
    await manageListPage.openColumnFilter("Title");
    await manageListPage.setOpenColumnFilterValue(seedMeta.titleFilterToken);
    await expectUrlParam("title", JSON.stringify(seedMeta.titleFilterToken));
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(1);
    await page.keyboard.press("Escape");
    await manageListPage.resetToolbarFiltersIfVisible();
    await expectBaselineUrlParams();

    await manageListPage.setGlobalSearch(seedMeta.sortToken);
    await expectUrlParam("query", seedMeta.sortToken);
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(3);

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

    await manageListPage.resetToolbarFiltersIfVisible();
    await expectBaselineUrlParams();

    // Phase 6: selected-row remove flow
    await manageListPage.setGlobalSearch(seedMeta.addableListingTitle);
    await expect.poll(async () => manageListPage.visibleRowCount()).toBe(1);
    await manageListPage.selectFirstVisibleRow();
    await manageListPage.clickRemoveSelected();
    await manageListPage.confirmRemoveSelected();
    await expect(toast("Listings removed from list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "No listings found" })).toBeVisible();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`0\\s*/\\s*${seedMeta.totalListListingsBeforeAdd}`),
    );
  });
});
