import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { toSentenceCaseCultivarName } from "../../src/lib/utils/cultivar-utils";
import { test, expect } from "./fixtures/app-fixtures";
import {
  seedCreateEditListingData,
  type CreateEditListingSeedMeta,
} from "./utils/seed-create-edit-listing";

test.describe("create/edit listing flow @local", () => {
  let seedMeta: CreateEditListingSeedMeta;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      seedMeta = await seedCreateEditListingData({ db });
    });
  });

  test("user can complete full create and edit listing workflow", async ({
    page,
    dashboardListings,
    createListingDialog,
    editListingDialog,
  }, testInfo) => {
    test.slow();

    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message });

    const expectToast = async (message: string) => {
      await expect(toast(message).first()).toBeVisible();
    };

    const captureCheckpoint = async (name: string) => {
      const image = await page.screenshot({ fullPage: true });
      await testInfo.attach(`${name}.png`, {
        body: image,
        contentType: "image/png",
      });
    };

    const expectUrlParam = async (key: string, expected: string | null) => {
      await expect(page).toHaveURL(
        (url) => url.searchParams.get(key) === expected,
      );
    };

    const expectTableParamsCleared = async () => {
      await expectUrlParam("query", null);
      await expectUrlParam("lists", null);
      await expectUrlParam("title", null);
      await expectUrlParam("description", null);
      await expectUrlParam("privateNote", null);
      await expectUrlParam("summary", null);
      await expectUrlParam("page", null);
      await expectUrlParam("size", null);
    };

    const closeColumnFilterAndReset = async () => {
      await page.keyboard.press("Escape");
      await dashboardListings.resetToolbarFiltersIfVisible();
      await expectTableParamsCleared();
    };

    const createAhsSearchDisplayName =
      toSentenceCaseCultivarName(seedMeta.createAhsName) ??
      seedMeta.createAhsName;
    const relinkAhsSearchDisplayName =
      toSentenceCaseCultivarName(seedMeta.relinkAhsName) ??
      seedMeta.relinkAhsName;

    // Phase A: auth + listings entry
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.evaluate(() => {
      localStorage.removeItem("table-state-listings-table");
    });

    await dashboardListings.goto();
    await expect(page).toHaveURL(/\/dashboard\/listings/);
    await dashboardListings.isReady();

    // Phase B: create dialog full UX
    await dashboardListings.createListingButton.click();
    await createListingDialog.isReady();
    await captureCheckpoint("create-dialog-initial");

    await expect(createListingDialog.createButton).toBeDisabled();

    await createListingDialog.searchAndSelectAhsListing(
      seedMeta.createAhsSearch,
      createAhsSearchDisplayName,
    );
    await expect(createListingDialog.titleInput).toHaveValue(
      createAhsSearchDisplayName,
    );
    await captureCheckpoint("create-dialog-ahs-selected");

    await createListingDialog.changeTitle("Temporary Create Override");
    await createListingDialog.syncTitleWithAhs();
    await expect(createListingDialog.titleInput).toHaveValue(
      createAhsSearchDisplayName,
    );

    await createListingDialog.changeTitle(seedMeta.createCustomTitle);
    await createListingDialog.cancel();
    await expect(
      dashboardListings.listingRow(seedMeta.createCustomTitle),
    ).toHaveCount(0);

    await dashboardListings.createListingButton.click();
    await createListingDialog.isReady();
    await createListingDialog.searchAndSelectAhsListing(
      seedMeta.createAhsSearch,
      createAhsSearchDisplayName,
    );
    await createListingDialog.changeTitle(seedMeta.createCustomTitle);
    await createListingDialog.createListing();

    await expectToast("Listing created");
    await editListingDialog.isReady();

    const createdEditingId = await editListingDialog.getEditingParamFromUrl();
    expect(createdEditingId).not.toBeNull();
    await expectUrlParam("editing", createdEditingId);

    // Phase C: full non-image edit UX
    const editedDescription = `Edited description ${seedMeta.descriptionToken}`;
    const editedPrivateNote = `Edited note ${seedMeta.privateNoteToken}`;
    const pendingPrivateNote = `Pending close note ${seedMeta.pendingPrivateNoteToken}`;

    await editListingDialog.fillTitle(seedMeta.editedTitle);

    await editListingDialog.fillDescription(editedDescription);
    await editListingDialog.fillPrice(42);
    await editListingDialog.fillPrivateNote(editedPrivateNote);
    await editListingDialog.setStatusToHidden();
    await editListingDialog.clickSaveChanges();
    await expectToast("Changes saved");

    await editListingDialog.openListsPicker();
    await editListingDialog.toggleListByName(seedMeta.existingListTitle);
    await editListingDialog.closeListsPicker();
    await expectToast("Lists updated");
    await expect(
      editListingDialog.selectedListChip(seedMeta.existingListTitle),
    ).toBeVisible();

    await editListingDialog.createList(seedMeta.listAName);
    await expect(
      editListingDialog.selectedListChip(seedMeta.listAName),
    ).toBeVisible();

    await editListingDialog.createList(seedMeta.listBName);
    await expect(
      editListingDialog.selectedListChip(seedMeta.listBName),
    ).toBeVisible();

    await editListingDialog.openListsPicker();
    await editListingDialog.toggleListByName(seedMeta.listAName);
    await editListingDialog.closeListsPicker();
    await expectToast("Lists updated");
    await expect(
      editListingDialog.selectedListChip(seedMeta.existingListTitle),
    ).toBeVisible();
    await expect(
      editListingDialog.selectedListChip(seedMeta.listBName),
    ).toBeVisible();
    await expect(
      editListingDialog.selectedListChip(seedMeta.listAName),
    ).toHaveCount(0);

    await editListingDialog.fillTitle("Manual Title Before AHS Sync");
    await editListingDialog.syncAhsName();
    await expectToast("Name synced successfully");
    await expect(editListingDialog.titleInput).toHaveValue(
      seedMeta.createAhsName,
    );

    await editListingDialog.unlinkAhs();
    await expectToast("Listing unlinked successfully");
    // Wait for the dialog to be ready after unlink mutation
    await editListingDialog.isReady();
    await expect(editListingDialog.ahsListingSelectButton).toBeVisible();
    await captureCheckpoint("edit-dialog-ahs-unlinked");

    // Verify unlink persists after save (regression test for link/unlink bug)
    await editListingDialog.clickSaveChanges();
    await expectToast("Changes saved");
    // Wait for the dialog to be ready after save mutation
    await editListingDialog.isReady();
    await expect(editListingDialog.ahsListingSelectButton).toBeVisible();
    await captureCheckpoint("edit-dialog-ahs-unlinked-after-save");

    await editListingDialog.relinkAhs(
      seedMeta.relinkAhsSearch,
      relinkAhsSearchDisplayName,
    );
    await expectToast("Listing linked successfully");
    await expect(
      editListingDialog.linkedAhsText(seedMeta.relinkAhsName),
    ).toBeVisible();
    await captureCheckpoint("edit-dialog-ahs-relinked");

    await editListingDialog.fillTitle("Relink Manual Title Override");
    await editListingDialog.syncAhsName();
    await expectToast("Name synced successfully");
    await expect(editListingDialog.titleInput).toHaveValue(
      seedMeta.relinkAhsName,
    );

    await editListingDialog.typePrivateNoteWithoutBlur(pendingPrivateNote);
    await editListingDialog.closeWithHeaderX();
    await expectToast("Changes saved");
    await expectUrlParam("editing", null);

    // Phase D: table propagation checks
    await dashboardListings.setGlobalSearch(seedMeta.relinkAhsName);
    await expectUrlParam("query", seedMeta.relinkAhsName);
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toBeVisible();
    await expect(dashboardListings.statusCell("HIDDEN")).toBeVisible();

    await dashboardListings.openColumnFilter("Description");
    await dashboardListings.setOpenColumnFilterValue(seedMeta.descriptionToken);
    await expectUrlParam(
      "description",
      JSON.stringify(seedMeta.descriptionToken),
    );
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toBeVisible();
    await closeColumnFilterAndReset();

    await dashboardListings.openColumnFilter("Private Notes");
    await dashboardListings.setOpenColumnFilterValue(
      seedMeta.pendingPrivateNoteToken,
    );
    await expectUrlParam(
      "privateNote",
      JSON.stringify(seedMeta.pendingPrivateNoteToken),
    );
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toBeVisible();
    await closeColumnFilterAndReset();

    await dashboardListings.openListsFilter();
    await dashboardListings.toggleListFilterOption(seedMeta.existingListTitle);
    await page.keyboard.press("Escape");
    await expectUrlParam("lists", seedMeta.existingListId);
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toBeVisible();
    await dashboardListings.openListsFilter();
    await dashboardListings.clearListsFilterInPopover();
    await page.keyboard.press("Escape");
    await dashboardListings.resetToolbarFiltersIfVisible();
    await expectTableParamsCleared();

    await dashboardListings.openListsFilter();
    await dashboardListings.toggleListFilterOption(seedMeta.listAName);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "No listings" }),
    ).toBeVisible();
    await dashboardListings.openListsFilter();
    await dashboardListings.clearListsFilterInPopover();
    await page.keyboard.press("Escape");
    await dashboardListings.resetToolbarFiltersIfVisible();
    await expectTableParamsCleared();

    await dashboardListings.setGlobalSearch(seedMeta.relinkAhsName);
    await expectUrlParam("query", seedMeta.relinkAhsName);
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toBeVisible();
    await captureCheckpoint("listings-table-final-row-state");

    // Phase E: delete from edit dialog
    await dashboardListings.openFirstVisibleRowActions();
    await dashboardListings.chooseRowActionEdit();
    await editListingDialog.isReady();
    await expect(page).toHaveURL(/editing=/);

    await editListingDialog.clickDeleteListing();
    await editListingDialog.confirmDeleteListing();
    await expectToast("Listing deleted successfully");
    await expectUrlParam("editing", null);

    await expect(
      page.getByRole("heading", { name: "No listings" }),
    ).toBeVisible();
    await expect(
      dashboardListings.listingRow(seedMeta.relinkAhsName),
    ).toHaveCount(0);
    await captureCheckpoint("post-delete-table-state");
  });
});
