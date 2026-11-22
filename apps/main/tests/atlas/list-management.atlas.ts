import type { Page } from "@playwright/test";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };
const introductionsListId = "7";
const introductionsListTitle = "Kay Cline's Introductions";

async function openLists(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard/lists");

  const lists = new DashboardLists(page);
  await lists.isReady();
  await expect(lists.listRow(introductionsListTitle)).toBeVisible();
  await expect(lists.rows()).toHaveCount(7);
  return lists;
}

async function openManageList(page: Page, viewport: typeof desktop) {
  await page.setViewportSize(viewport);
  await page.goto(`/dashboard/lists/${introductionsListId}`);

  const list = new ManageListPage(page);
  await list.isReady();
  await expect(list.heading).toContainText(introductionsListTitle);
  await expect(list.rows()).toHaveCount(20);
  await expect(list.pageIndicator()).toHaveText("Page 1 of 2");
  return list;
}

async function checkListLibrary(page: Page, viewport: typeof desktop) {
  await openLists(page, viewport);
}

async function checkCreateList(page: Page, viewport: typeof desktop) {
  const lists = await openLists(page, viewport);
  await lists.createListButton.click();
  const createSurface = lists.createSurface();
  await expect(createSurface).toBeVisible();
  await createSurface.getByLabel("Title").fill("Late Season Favorites");
  await expect(
    createSurface.getByRole("button", { name: "Create List" }),
  ).toBeEnabled();
}

async function checkPopulatedList(page: Page, viewport: typeof desktop) {
  const list = await openManageList(page, viewport);
  await expect(list.listingRow("A Little Bit Famous")).toBeVisible();
}

async function checkAddListing(page: Page, viewport: typeof desktop) {
  const list = await openManageList(page, viewport);
  await list.openAddListingsDialog();
  await list.searchAddListings("16-080");
  await expect(
    page.locator('[data-slot="command-item"]').filter({ hasText: "16-080" }),
  ).toHaveCount(1);
}

async function checkRemoveListing(page: Page, viewport: typeof desktop) {
  const list = await openManageList(page, viewport);
  await list.setGlobalSearch("Coffee Frenzy");
  await expect(list.rows()).toHaveCount(1);
  await list.selectFirstVisibleRow();
  await list.clickRemoveSelected();
  await expect(
    page.getByRole("alertdialog").getByText("Remove Listings"),
  ).toBeVisible();
}

test("Desktop list library", async ({ page }) => {
  await checkListLibrary(page, desktop);
  await captureAtlasState(page, "list-management-desktop-library");
});

test("Mobile list library", async ({ page }) => {
  await checkListLibrary(page, mobile);
  await captureAtlasState(page, "list-management-mobile-library");
});

test("Desktop new list", async ({ page }) => {
  await checkCreateList(page, desktop);
  await captureAtlasState(page, "list-management-desktop-create");
});

test("Mobile new list", async ({ page }) => {
  await checkCreateList(page, mobile);
  await captureAtlasState(page, "list-management-mobile-create");
});

test("Desktop populated list", async ({ page }) => {
  await checkPopulatedList(page, desktop);
  await captureAtlasState(page, "list-management-desktop-populated");
});

test("Mobile populated list", async ({ page }) => {
  await checkPopulatedList(page, mobile);
  await captureAtlasState(page, "list-management-mobile-populated");
});

test("Desktop add-listing results", async ({ page }) => {
  await checkAddListing(page, desktop);
  await captureAtlasState(page, "list-management-desktop-add");
});

test("Mobile add-listing results", async ({ page }) => {
  await checkAddListing(page, mobile);
  await captureAtlasState(page, "list-management-mobile-add");
});

test("Desktop remove confirmation", async ({ page }) => {
  await checkRemoveListing(page, desktop);
  await captureAtlasState(page, "list-management-desktop-remove");
});

test("Mobile remove confirmation", async ({ page }) => {
  await checkRemoveListing(page, mobile);
  await captureAtlasState(page, "list-management-mobile-remove");
});
