import { captureCheckpoint, expect, test } from "./atlas-test";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { CreateListingDialog } from "../e2e/pages/create-listing-dialog";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";

test.setTimeout(120_000);

const personaByProject = {
  "rolling-oaks": "prodlike+clerk_test_rollingoaks@example.com",
  "plant-fancy-gardens": "prodlike+clerk_test_plantfancy@example.com",
} as const;

const checkpoints = [
  { name: "dashboard-overview", route: "/dashboard", heading: "Dashboard" },
  { name: "dashboard-listings", route: "/dashboard/listings", heading: "Listings" },
  { name: "dashboard-lists", route: "/dashboard/lists", heading: "Lists" },
  { name: "dashboard-profile", route: "/dashboard/profile", heading: "Profile" },
] as const;

test("dashboard states", async ({ page }, testInfo) => {
  const persona =
    personaByProject[testInfo.project.name as keyof typeof personaByProject];
  if (!persona) throw new Error(`Unknown atlas persona ${testInfo.project.name}`);

  for (const checkpoint of checkpoints) {
    await page.goto(checkpoint.route);
    await expect(page).toHaveURL(checkpoint.route);
    await expect(
      page.getByRole("button", { name: `${persona} ${persona}` }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: checkpoint.heading }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await captureCheckpoint(
      page,
      testInfo,
      `${testInfo.project.name}-${checkpoint.name}`,
    );
  }
});

test("dashboard interaction states", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "plant-fancy-gardens", "One representative pro persona covers shared dashboard interactions.");
  test.setTimeout(180_000);

  const listings = new DashboardListings(page);
  const createDialog = new CreateListingDialog(page);
  const editDialog = new EditListingDialog(page);
  const lists = new DashboardLists(page);

  await listings.goto();
  await listings.isReady();
  await expect(listings.listingTableReady).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 });

  await listings.setGlobalSearch("Blue");
  await expect(listings.filteredCount()).toBeVisible();
  await captureCheckpoint(page, testInfo, "dashboard-listings-basic-search", "Listings table with a real basic text filter and result count applied.");

  await listings.resetToolbarFiltersIfVisible();
  await page.getByTestId("search-mode-switch").click();
  await expect(page.getByText("Bloom Traits", { exact: true })).toBeVisible();
  await captureCheckpoint(page, testInfo, "dashboard-listings-advanced-filters", "Expanded advanced search with cultivar, plant-trait, bloom, and list filter groups.");

  await listings.createListingButton.click();
  await createDialog.isReady();
  await captureCheckpoint(page, testInfo, "create-listing-dialog-empty", "Create Listing dialog before a cultivar or custom title is selected.");
  await createDialog.openAhsPicker();
  await captureCheckpoint(page, testInfo, "create-listing-cultivar-picker", "Nested cultivar database picker inside the Create Listing flow.");
  await page.keyboard.press("Escape");
  await createDialog.cancel();

  await listings.openFirstVisibleRowEdit();
  await editDialog.isReady();
  await captureCheckpoint(page, testInfo, "edit-listing-dialog", "Edit Listing dialog populated with real title, price, status, descriptions, and private notes.");
  await editDialog.openListsPicker();
  await captureCheckpoint(page, testInfo, "edit-listing-list-picker", "Edit Listing with its list-membership picker open.");
  await editDialog.closeListsPicker();
  await editDialog.close();

  await lists.goto();
  await lists.isReady();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await lists.setGlobalSearch("sale");
  await captureCheckpoint(page, testInfo, "dashboard-lists-filtered", "List management table with a text filter applied.");
  await lists.globalSearchInput.fill("");
  await lists.createListButton.click();
  await expect(page.getByRole("dialog").filter({ hasText: "Create New List" })).toBeVisible();
  await captureCheckpoint(page, testInfo, "create-list-dialog", "Create List dialog with required title state and disabled confirmation.");
  await page.keyboard.press("Escape");

  await page.goto("/dashboard/tags");
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await captureCheckpoint(page, testInfo, "dashboard-tag-designer", "Tag selection, layout controls, preview, and print workflow.");
});
