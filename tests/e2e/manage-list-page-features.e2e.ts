import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedManageListPageData,
  type ManageListPageSeedMeta,
} from "./utils/seed-manage-list-page";

const URL_SYNC_POLL_INTERVALS_MS = [50, 100, 150, 250];

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
    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    const expectUrlParamSoon = async (key: string, expected: string | null) => {
      await expect
        .poll(() => new URL(page.url()).searchParams.get(key), {
          intervals: URL_SYNC_POLL_INTERVALS_MS,
        })
        .toBe(expected);
    };

    const expectBaselineUrlParams = async () => {
      await expectUrlParamSoon("page", null);
      await expectUrlParamSoon("size", null);
      await expectUrlParamSoon("query", null);
      await expectUrlParamSoon("title", null);
    };

    const expectPageIndicator = async (
      currentPage: number,
      totalPages: number,
    ) => {
      await expect(manageListPage.pageIndicator()).toHaveText(
        `Page ${currentPage} of ${totalPages}`,
      );
    };

    const expectFirstRowTitle = async (title: string) => {
      await expect(manageListPage.rows().first().locator("td").nth(1)).toContainText(
        title,
      );
    };

    const assertSortTogglesBetween = async (
      columnLabel: string,
      ascFirstTitle: string,
      descFirstTitle: string,
    ) => {
      await manageListPage.sortByColumn(columnLabel);
      const firstToggleTitle = await manageListPage.firstRowTitle();
      expect([ascFirstTitle, descFirstTitle]).toContain(firstToggleTitle);

      const oppositeExpectedTitle =
        firstToggleTitle === ascFirstTitle ? descFirstTitle : ascFirstTitle;

      await manageListPage.sortByColumn(columnLabel);
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
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/lists/${seedMeta.listId}`),
    );
    await expectBaselineUrlParams();

    // Phase 2: list form edit + persistence
    await manageListPage.fillTitle(seedMeta.updatedListTitle);
    await manageListPage.fillDescription(seedMeta.updatedListDescription);
    await manageListPage.saveChangesAndWait();

    // Phase 3: baseline table + pagination
    await expect(manageListPage.rows()).toHaveCount(seedMeta.defaultPageSize);
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    await manageListPage.goToNextPage();
    await expectPageIndicator(2, seedMeta.expectedPageCountBeforeAdd);
    await expectUrlParamSoon("page", "2");
    await expect(manageListPage.rows()).toHaveCount(
      seedMeta.expectedSecondPageRowsBeforeAdd,
    );

    await manageListPage.goToFirstPage();
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);
    await expectUrlParamSoon("page", null);

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
    await expect(toast("Listing added to list")).toBeVisible();

    await manageListPage.setGlobalSearch(seedMeta.addableListingTitle);
    await expectUrlParamSoon("query", seedMeta.addableListingTitle);
    await expect(manageListPage.rows()).toHaveCount(1);
    await expect(
      manageListPage.listingRow(seedMeta.addableListingTitle),
    ).toBeVisible();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`1\\s*/\\s*${seedMeta.totalListListingsAfterAdd}`),
    );

    await manageListPage.resetToolbarFiltersIfVisible();
    await expectBaselineUrlParams();
    await expectPageIndicator(1, seedMeta.expectedPageCountAfterAdd);

    // Phase 5: column filter + sorting checks
    await manageListPage.openColumnFilter("Title");
    await manageListPage.setOpenColumnFilterValue(seedMeta.titleFilterToken);
    await expectUrlParamSoon(
      "title",
      JSON.stringify(seedMeta.titleFilterToken),
    );
    await expect(manageListPage.rows()).toHaveCount(1);
    await page.keyboard.press("Escape");
    await manageListPage.resetToolbarFiltersIfVisible();
    await expectBaselineUrlParams();

    await manageListPage.setGlobalSearch(seedMeta.sortToken);
    await expectUrlParamSoon("query", seedMeta.sortToken);
    await expect(manageListPage.rows()).toHaveCount(3);

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
    await expect(manageListPage.rows()).toHaveCount(1);
    await manageListPage.selectFirstVisibleRow();
    await manageListPage.clickRemoveSelected();
    await manageListPage.confirmRemoveSelected();
    await expect(toast("Listings removed from list")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No listings found" }),
    ).toBeVisible();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`0\\s*/\\s*${seedMeta.totalListListingsBeforeAdd}`),
    );
  });
});
