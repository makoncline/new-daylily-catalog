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
    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    const expectUrlParam = async (key: string, expected: string | null) => {
      await expect
        .poll(() => new URL(page.url()).searchParams.get(key))
        .toBe(expected);
    };

    const expectBaselineUrlParams = async () => {
      await expectUrlParam("page", null);
      await expectUrlParam("size", null);
      await expectUrlParam("query", null);
      await expectUrlParam("editing", null);
    };

    const expectPageIndicator = async (
      currentPage: number,
      totalPages: number,
    ) => {
      await expect(dashboardLists.pageIndicator()).toBeVisible({
        timeout: 30000,
      });
      await expect(dashboardLists.pageIndicator()).toHaveText(
        `Page ${currentPage} of ${totalPages}`,
        { timeout: 30000 },
      );
    };

    const expectFirstRowTitle = async (title: string) => {
      await expect.poll(async () => dashboardLists.firstRowTitle()).toBe(title);
    };

    const resetAndVerifyBaseline = async () => {
      await dashboardLists.resetToolbarFiltersIfVisible();
      await expect
        .poll(async () => dashboardLists.visibleRowCount())
        .toBe(seedMeta.defaultPageSize);
      await expectPageIndicator(1, seedMeta.expectedPageCount);
      await expectBaselineUrlParams();
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
      for (let attempt = 0; attempt < 2; attempt++) {
        await dashboardLists.sortByColumn(columnLabel);

        try {
          await expectFirstRowTitle(oppositeExpectedTitle);
          return;
        } catch {
          // Some table headers can cycle through an intermediate unsorted state.
          // Retry once to reach the opposite sort direction.
        }
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
    await expectBaselineUrlParams();

    // Phase 2: baseline table and pagination behavior
    await expect
      .poll(async () => dashboardLists.visibleRowCount())
      .toBe(seedMeta.defaultPageSize);
    await expectPageIndicator(1, seedMeta.expectedPageCount);

    const firstPageFirstTitle = await dashboardLists.firstRowTitle();

    await dashboardLists.goToNextPage();
    await expectPageIndicator(2, seedMeta.expectedPageCount);
    await expectUrlParam("page", "2");
    await expect
      .poll(async () => dashboardLists.visibleRowCount())
      .toBe(seedMeta.expectedSecondPageRows);

    const secondPageFirstTitle = await dashboardLists.firstRowTitle();
    expect(secondPageFirstTitle).not.toBe(firstPageFirstTitle);

    await dashboardLists.goToPrevPage();
    await expectPageIndicator(1, seedMeta.expectedPageCount);
    await expectUrlParam("page", null);

    await dashboardLists.goToLastPage();
    await expectPageIndicator(
      seedMeta.expectedPageCount,
      seedMeta.expectedPageCount,
    );
    await expectUrlParam("page", String(seedMeta.expectedPageCount));

    await dashboardLists.goToFirstPage();
    await expectPageIndicator(1, seedMeta.expectedPageCount);
    await expectUrlParam("page", null);

    await dashboardLists.setRowsPerPage(50);
    await expectPageIndicator(1, 3);
    await expectUrlParam("size", "50");
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(50);

    await page.evaluate(() => {
      localStorage.removeItem("table-state-lists-table");
    });
    await dashboardLists.goto();
    await dashboardLists.isReady();
    await expectPageIndicator(1, seedMeta.expectedPageCount);
    await expectBaselineUrlParams();
    await expect
      .poll(async () => dashboardLists.visibleRowCount())
      .toBe(seedMeta.defaultPageSize);

    // Phase 3: global search
    await dashboardLists.setGlobalSearch(seedMeta.globalSearchToken);
    await expectUrlParam("query", seedMeta.globalSearchToken);
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(1);
    await expect(
      dashboardLists.listRow(seedMeta.globalSearchTitle),
    ).toBeVisible();
    await resetAndVerifyBaseline();

    // Phase 4: representative sorting checks on isolated fixture rows
    await dashboardLists.setGlobalSearch(seedMeta.sortToken);
    await expectUrlParam("query", seedMeta.sortToken);
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(3);

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
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(1);
    await expect(
      dashboardLists.listRow(seedMeta.editTargetTitle),
    ).toBeVisible();

    await dashboardLists.openFirstVisibleRowActions();
    await expect(dashboardLists.manageRowAction()).toBeVisible();
    const manageHref = await dashboardLists.manageRowActionHref();
    expect(manageHref).toMatch(/^\/dashboard\/lists\/.+/);

    await dashboardLists.chooseRowActionEdit();
    await expect(dashboardLists.editDialog()).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("editing"))
      .not.toBe(null);

    await dashboardLists.editTitleInput().fill(seedMeta.editTargetUpdatedTitle);
    await dashboardLists
      .editDescriptionInput()
      .fill(
        `Updated description ${seedMeta.editTargetUpdatedDescriptionToken}`,
      );
    await dashboardLists.saveChangesButton().click();
    await expect(toast("List updated")).toBeVisible({ timeout: 10000 });

    await page.pause();
    await dashboardLists.closeEditDialog();
    await expectUrlParam("editing", null);

    await dashboardLists.setGlobalSearch(seedMeta.editTargetUpdatedTitle);
    await expectUrlParam("query", seedMeta.editTargetUpdatedTitle);
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(1);
    await expect(
      dashboardLists.listRow(seedMeta.editTargetUpdatedTitle),
    ).toBeVisible();

    await dashboardLists.setGlobalSearch(seedMeta.deleteTargetTitle);
    await expectUrlParam("query", seedMeta.deleteTargetTitle);
    await expect.poll(async () => dashboardLists.visibleRowCount()).toBe(1);
    await expect(
      dashboardLists.listRow(seedMeta.deleteTargetTitle),
    ).toBeVisible();

    await dashboardLists.openFirstVisibleRowActions();
    await dashboardLists.chooseRowActionDelete();
    await dashboardLists.confirmDelete();
    await expect(toast("List deleted")).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "No lists found" }),
    ).toBeVisible();
    await expect(
      dashboardLists.listRow(seedMeta.deleteTargetTitle),
    ).toHaveCount(0);
  });
});
