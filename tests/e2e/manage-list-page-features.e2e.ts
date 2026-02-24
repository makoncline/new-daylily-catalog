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
    dashboardShell,
    dashboardLists,
  }) => {
    const listUpdatedToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "List updated" })
      .first();

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

    // Phase 2: list form edit + navigate-away persistence
    await expect(manageListPage.saveChangesButton).toBeDisabled();
    await manageListPage.fillTitle(seedMeta.updatedListTitle);
    await manageListPage.fillDescription(seedMeta.updatedListDescription);
    await expect(manageListPage.saveChangesButton).toBeEnabled();

    await dashboardShell.goToLists();
    await expect(page).toHaveURL(/\/dashboard\/lists$/);

    await dashboardLists.isReady();
    await dashboardLists.setGlobalSearch(seedMeta.updatedListTitle);
    await expect(
      dashboardLists.listRow(seedMeta.updatedListTitle),
    ).toBeVisible();
    await dashboardLists.openFirstVisibleRowActions();
    await dashboardLists.manageRowAction().click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/lists/${seedMeta.listId}`),
    );

    await manageListPage.isReady();
    await expect(manageListPage.titleInput).toHaveValue(seedMeta.updatedListTitle);
    await expect(manageListPage.descriptionInput).toHaveValue(
      seedMeta.updatedListDescription,
    );

    // Phase 3: baseline table + pagination
    await expect(manageListPage.rows()).toHaveCount(seedMeta.defaultPageSize);
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    await manageListPage.goToNextPage();
    await expectPageIndicator(2, seedMeta.expectedPageCountBeforeAdd);
    await expect(manageListPage.rows()).toHaveCount(
      seedMeta.expectedSecondPageRowsBeforeAdd,
    );

    await manageListPage.goToFirstPage();
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    await page.evaluate(() => {
      localStorage.removeItem("table-state-list-listings-table");
    });
    await manageListPage.goto(seedMeta.listId);
    await manageListPage.isReady();
    await expectPageIndicator(1, seedMeta.expectedPageCountBeforeAdd);

    // Phase 4: add listing flow
    await manageListPage.openAddListingsDialog();
    await manageListPage.searchAddListings(seedMeta.addableListingToken);
    await manageListPage.selectListingToAdd(seedMeta.addableListingTitle);
    await expect(
      manageListPage.listingRow(seedMeta.addableListingTitle),
    ).toBeVisible();

    await manageListPage.setGlobalSearch(seedMeta.addableListingTitle);
    await expect(manageListPage.rows()).toHaveCount(1);
    await expect(
      manageListPage.listingRow(seedMeta.addableListingTitle),
    ).toBeVisible();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`1\\s*/\\s*${seedMeta.totalListListingsAfterAdd}`),
    );

    await manageListPage.resetToolbarFiltersIfVisible();
    await expectPageIndicator(1, seedMeta.expectedPageCountAfterAdd);
    await expect(manageListPage.saveChangesButton).toBeEnabled();
    await manageListPage.saveChanges();
    await expect(listUpdatedToast).toBeVisible();
    await expect(manageListPage.saveChangesButton).toBeDisabled();

    // Phase 5: column filter + sorting checks
    await manageListPage.openColumnFilter("Title");
    await manageListPage.setOpenColumnFilterValue(seedMeta.titleFilterToken);
    await expect(manageListPage.rows()).toHaveCount(1);
    await page.keyboard.press("Escape");
    await manageListPage.resetToolbarFiltersIfVisible();

    await manageListPage.setGlobalSearch(seedMeta.sortToken);
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

    // Phase 6: selected-row remove flow
    await manageListPage.setGlobalSearch(seedMeta.addableListingTitle);
    await expect(manageListPage.rows()).toHaveCount(1);
    await manageListPage.selectFirstVisibleRow();
    await manageListPage.clickRemoveSelected();
    await manageListPage.confirmRemoveSelected();
    await expect(
      page.getByRole("heading", { name: "No listings found" }),
    ).toBeVisible();
    await expect(manageListPage.saveChangesButton).toBeEnabled();
    await expect(manageListPage.filteredCount()).toHaveText(
      new RegExp(`0\\s*/\\s*${seedMeta.totalListListingsBeforeAdd}`),
    );
  });
});
