import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedListsPageData,
  type ListsPageSeedMeta,
} from "./utils/seed-lists-page";

test.describe("lists page features @local", () => {
  let seedMeta: ListsPageSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedListsPageData({ db });
    });
  });

  test("user can use lists table search sorting row actions and pagination", async ({
    page,
    dashboardLists,
  }) => {
    const expectPageIndicator = async (
      currentPage: number,
      totalPages: number,
    ) => {
      await expect(dashboardLists.pageIndicator()).toBeVisible();
      await expect(dashboardLists.pageIndicator()).toHaveText(
        `Page ${currentPage} of ${totalPages}`,
      );
    };

    const expectFirstRowTitle = async (title: string) => {
      await expect(dashboardLists.rows().first().locator("td").first()).toHaveText(
        title,
      );
    };

    const resetAndVerifyBaseline = async () => {
      await dashboardLists.resetToolbarFiltersIfVisible();
      await expect(dashboardLists.rows()).toHaveCount(seedMeta.defaultPageSize);
      await expectPageIndicator(1, seedMeta.expectedPageCount);
    };

    const assertSortTogglesBetween = async (
      columnLabel: string,
      ascFirstTitle: string,
      descFirstTitle: string,
    ) => {
      let firstToggleTitle = "";

      await dashboardLists.sortByColumn(columnLabel);
      await expect
        .poll(async () => {
          firstToggleTitle = await dashboardLists.firstRowTitle();
          return (
            firstToggleTitle === ascFirstTitle ||
            firstToggleTitle === descFirstTitle
          );
        })
        .toBe(true);

      const oppositeExpectedTitle =
        firstToggleTitle === ascFirstTitle ? descFirstTitle : ascFirstTitle;
      await dashboardLists.sortByColumn(columnLabel);
      const secondToggleTitle = await dashboardLists.firstRowTitle();
      if (secondToggleTitle !== oppositeExpectedTitle) {
        await dashboardLists.sortByColumn(columnLabel);
      }
      await expectFirstRowTitle(oppositeExpectedTitle);
    };

    // Phase 1: sign in and navigate to lists
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.evaluate(() => {
      localStorage.removeItem("table-state-lists-table");
    });

    await dashboardLists.goto();
    await expect(page).toHaveURL(/\/dashboard\/lists/);
    await dashboardLists.isReady();

    // Phase 2: baseline table and pagination behavior
    await expect(dashboardLists.rows()).toHaveCount(seedMeta.defaultPageSize);
    await expectPageIndicator(1, seedMeta.expectedPageCount);

    const firstPageFirstTitle = await dashboardLists.firstRowTitle();

    await dashboardLists.goToNextPage();
    await expectPageIndicator(2, seedMeta.expectedPageCount);
    await expect(dashboardLists.rows()).toHaveCount(seedMeta.expectedSecondPageRows);

    const secondPageFirstTitle = await dashboardLists.firstRowTitle();
    expect(secondPageFirstTitle).not.toBe(firstPageFirstTitle);

    await dashboardLists.goToPrevPage();
    await expectPageIndicator(1, seedMeta.expectedPageCount);

    await dashboardLists.goToLastPage();
    await expectPageIndicator(
      seedMeta.expectedPageCount,
      seedMeta.expectedPageCount,
    );

    await dashboardLists.goToFirstPage();
    await expectPageIndicator(1, seedMeta.expectedPageCount);

    await dashboardLists.setRowsPerPage(50);
    await expectPageIndicator(1, 3);
    await expect(dashboardLists.rows()).toHaveCount(50);

    await page.evaluate(() => {
      localStorage.removeItem("table-state-lists-table");
    });
    await dashboardLists.goto();
    await dashboardLists.isReady();
    await expectPageIndicator(1, seedMeta.expectedPageCount);
    await expect(dashboardLists.rows()).toHaveCount(seedMeta.defaultPageSize);

    // Phase 3: global search
    await dashboardLists.setGlobalSearch(seedMeta.globalSearchToken);
    await expect(dashboardLists.rows()).toHaveCount(1);
    await expect(
      dashboardLists.listRow(seedMeta.globalSearchTitle),
    ).toBeVisible();
    await resetAndVerifyBaseline();

    // Phase 4: representative sorting checks on isolated fixture rows
    await dashboardLists.setGlobalSearch(seedMeta.sortToken);
    await expect(dashboardLists.rows()).toHaveCount(3);

    await assertSortTogglesBetween(
      "Title",
      seedMeta.sortExpectations.titleAscFirst,
      seedMeta.sortExpectations.titleDescFirst,
    );
    await assertSortTogglesBetween(
      "Description",
      seedMeta.sortExpectations.descriptionAscFirst,
      seedMeta.sortExpectations.descriptionDescFirst,
    );
    await assertSortTogglesBetween(
      "Listings",
      seedMeta.sortExpectations.listingsAscFirst,
      seedMeta.sortExpectations.listingsDescFirst,
    );
    await assertSortTogglesBetween(
      "Created",
      seedMeta.sortExpectations.createdAscFirst,
      seedMeta.sortExpectations.createdDescFirst,
    );
    await assertSortTogglesBetween(
      "Updated",
      seedMeta.sortExpectations.updatedAscFirst,
      seedMeta.sortExpectations.updatedDescFirst,
    );

    await resetAndVerifyBaseline();

    // Phase 5: row actions (manage link + edit + delete)
    await dashboardLists.setGlobalSearch(seedMeta.editTargetTitle);
    await expect(dashboardLists.rows()).toHaveCount(1);
    await expect(
      dashboardLists.listRow(seedMeta.editTargetTitle),
    ).toBeVisible();

    await dashboardLists.openFirstVisibleRowActions();
    await expect(dashboardLists.manageRowAction()).toBeVisible();
    const manageHref = await dashboardLists.manageRowActionHref();
    expect(manageHref).toMatch(/^\/dashboard\/lists\/.+/);

    await dashboardLists.chooseRowActionEdit();
    await expect(dashboardLists.editDialog()).toBeVisible();
    await expect(dashboardLists.saveChangesButton()).toBeDisabled();

    await dashboardLists.editTitleInput().fill(seedMeta.editTargetUpdatedTitle);
    await dashboardLists
      .editDescriptionInput()
      .fill(
        `Updated description ${seedMeta.editTargetUpdatedDescriptionToken}`,
      );
    await expect(dashboardLists.saveChangesButton()).toBeEnabled();

    await dashboardLists.closeEditDialog();

    await dashboardLists.setGlobalSearch(seedMeta.editTargetUpdatedTitle);
    await expect(dashboardLists.rows()).toHaveCount(1);
    await expect(
      dashboardLists.listRow(seedMeta.editTargetUpdatedTitle),
    ).toBeVisible();

    await dashboardLists.setGlobalSearch(seedMeta.deleteTargetTitle);
    await expect(dashboardLists.rows()).toHaveCount(1);
    await expect(
      dashboardLists.listRow(seedMeta.deleteTargetTitle),
    ).toBeVisible();

    await dashboardLists.openFirstVisibleRowActions();
    await dashboardLists.chooseRowActionDelete();
    await dashboardLists.confirmDelete();

    await expect(
      page.getByRole("heading", { name: "No lists found" }),
    ).toBeVisible();
    await expect(
      dashboardLists.listRow(seedMeta.deleteTargetTitle),
    ).toHaveCount(0);
  });
});
