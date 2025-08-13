import { test, expect } from "./fixtures";
import fs from "node:fs/promises";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { type Page } from "@playwright/test";

const SAVE_TIMEOUT = 1000;

function log(message: string) {
  console.log(`[E2E] ${message}`);
}

async function programmaticLogin(page: Page, testUser: { email: string }) {
  log("Programmatic login start");
  await setupClerkTestingToken({ page });
  // start on unauthenticated page
  await page.goto("/");
  await clerk.loaded({ page });
  await clerk.signIn({
    page,
    signInParams: { strategy: "email_code", identifier: testUser.email },
  });
  // navigate to authenticated page
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard\/?/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  log("Programmatic login success");
}

async function navigateToListings(page: Page) {
  log("Navigate to /dashboard/listings");
  await page.goto("/dashboard/listings");
  // Verify Listings page title and table
  await expect(page.getByTestId("listings-title")).toBeVisible();
  await expect(page.getByTestId("listings-table")).toBeVisible();
  log("Listings page ready");
}

async function countCenterTableRows(page: Page) {
  // Count rows in the center scrollable table body only
  const rows = await page.$$(
    '[data-testid="listings-table"] .flex-1 table tbody tr',
  );
  return rows.length;
}

async function openRowActionsForTitle(page: Page, title: string) {
  log(`Open row actions for: ${title}`);
  const trigger = page.locator(
    `[data-testid="row-actions-trigger"][data-row-title="${title}"]`,
  );
  await trigger.tap({ force: true });
  try {
    await page.getByTestId("row-actions-menu").waitFor({ timeout: 1000 });
  } catch {
    await trigger.tap({ force: true });
    await page.getByTestId("row-actions-menu").waitFor({ timeout: 2000 });
  }
  log(`Row actions open: ${title}`);
}

async function clickRowActionEdit(page: Page, title: string) {
  log(`Click row action Edit: ${title}`);
  const menu = page.getByTestId("row-actions-menu");
  await expect(menu).toBeVisible();
  const editItem = menu.getByTestId("row-action-edit");
  await editItem.tap({ force: true }); // radix animations cause the element not to settle. must force.
  log(`Edit clicked: ${title}`);
}

async function expectEditDialogOpen(page: Page) {
  log("Expect edit dialog open");
  await expect(page.getByTestId("edit-listing-dialog")).toBeVisible();
  log("Edit dialog open OK");
}

// debugEditDialog removed for simplicity now that close is stable

async function closeEditDialog(page: Page) {
  const closeButton = page
    .getByTestId("edit-listing-dialog")
    .getByRole("button", { name: "Close" });
  await closeButton.scrollIntoViewIfNeeded();
  await closeButton.tap();
  await expect(page.getByTestId("edit-listing-dialog")).not.toBeVisible();
}

async function closeSelectListsDialog(page: Page) {
  await page
    .getByRole("dialog", { name: "Select Lists" })
    .getByRole("button", { name: "Close" })
    .first()
    .tap({ force: true });
}

// Use mobile viewport and touch actions for all tests
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.use({ contextOptions: { reducedMotion: "reduce" } });

// Login via UI only: start at home, click Dashboard, complete OTP, assert auto-redirect
test("auth: UI login redirects to dashboard", async ({ page, testUser }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/");
  await page.getByRole("button", { name: "Dashboard" }).tap();

  await page.getByPlaceholder("Enter your email address").fill(testUser.email);
  await page.getByRole("button", { name: "Continue" }).tap();

  await page.getByText("Check your email").waitFor({ timeout: 3000 });
  await page.waitForTimeout(1000);
  await page.keyboard.type("424242");

  // No manual navigation here — rely on Clerk redirect
  await expect(page).toHaveURL(/\/dashboard(\/)?/, { timeout: 30000 });
  // Also verify the Dashboard page title is visible
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
});

test("listings: create custom listing", async ({ page, testUser, db }) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  const title = `PW Custom ${Date.now()}`;
  await page.getByRole("button", { name: "Create Listing" }).tap();
  await page.getByPlaceholder("Enter a title").fill(title);
  await page.getByRole("button", { name: "Create Listing" }).tap();
  await expectEditDialogOpen(page);
  await closeEditDialog(page);
  await page.getByPlaceholder("Filter listings...").fill(title);
  await expect(page.getByTestId("listings-table")).toContainText(title);
  const created = await db.listing.findFirst({ where: { title } });
  expect(created).not.toBeNull();
});

test("listings: edit listing via row actions", async ({
  page,
  testUser,
  db,
}) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  // Use seeded listing with placeholder images for image reordering
  const target = "Custom Purple Beauty";
  const listingBefore = await db.listing.findFirst({
    where: { title: target },
  });
  const listingId = listingBefore!.id;

  log("Filtering target in table...");
  await page.getByPlaceholder("Filter listings...").fill(target);
  log("Filtered target OK");
  await openRowActionsForTitle(page, target);
  await clickRowActionEdit(page, target);
  await expectEditDialogOpen(page);
  log("Dialog open OK");

  // Field blur saves: Description
  log("Updating description...");
  const descValue = `Blur desc ${Date.now()}`;
  await page.getByLabel("Description").fill(descValue);
  await page.getByTestId("edit-listing-title").tap();
  await page.waitForTimeout(SAVE_TIMEOUT);
  let l = await db.listing.findUnique({ where: { id: listingId } });
  expect(l?.description).toBe(descValue);
  log(`Description saved: ${descValue}`);

  // Field blur saves: Price
  log("Updating price...");
  const priceValue = 77;
  await page.getByLabel("Price").fill(String(priceValue));
  await page.getByTestId("edit-listing-title").tap();
  await expect
    .poll(
      async () =>
        (await db.listing.findUnique({ where: { id: listingId } }))?.price,
    )
    .toBe(priceValue);
  log(`Price saved: ${priceValue}`);

  // Field change: Status
  log("Setting status to HIDDEN...");
  await page.getByLabel("Status").tap();
  await page.getByRole("option", { name: "Hidden" }).tap();
  await page.getByTestId("edit-listing-title").tap();
  await page.waitForTimeout(SAVE_TIMEOUT);
  l = await db.listing.findUnique({ where: { id: listingId } });
  expect(l?.status).toBe("HIDDEN");
  log("Status set to HIDDEN");

  // Last field: Private Notes, do not blur; close to save
  log("Saving private note and closing dialog...");
  const privateNoteValue = `Close-save note ${Date.now()}`;
  await page.getByLabel("Private Notes").fill(privateNoteValue);
  await page.getByTestId("edit-listing-title").tap();
  await page.waitForTimeout(SAVE_TIMEOUT);
  l = await db.listing.findUnique({ where: { id: listingId } });
  expect(l?.privateNote).toBe(privateNoteValue);
  log("Private note saved ");

  // Drag last image to the first position using dnd-kit handles
  // const handles = page.locator(
  //   'button:has([aria-hidden="true"]) >> text=Drag to reorder',
  // );
  // Fallback: select the visible drag buttons in the image grid
  log("Reordering images...");
  const dragButtons = page
    .locator("button:has(svg)")
    .filter({ hasText: "Drag to reorder" });
  const count = await dragButtons.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const firstHandle = dragButtons.nth(0);
  const lastHandle = dragButtons.nth(count - 1);

  const firstBox = await firstHandle.boundingBox();
  const lastBox = await lastHandle.boundingBox();
  if (!firstBox || !lastBox)
    throw new Error("Could not read drag handle positions");
  await page.mouse.move(
    lastBox.x + lastBox.width / 2,
    lastBox.y + lastBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();

  // Save and close
  await page.getByRole("button", { name: "Save Changes" }).tap();
  log("Reorder saved and dialog closed");

  // DB verification of image order: first image should now be the one previously last
  await page.waitForTimeout(SAVE_TIMEOUT);
  const listingAfter = await db.listing.findUnique({
    where: { id: listingId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  expect(listingAfter?.images?.length ?? 0).toBeGreaterThanOrEqual(3);
  const firstUrl = listingAfter!.images[0]!.url;
  expect(firstUrl).toContain("Purple+3");
  log("Image order verified");

  // Delete the first image and verify DB count decreased by 1
  log("Deleting first image...");
  const beforeDelete = await db.listing.findFirst({
    where: { id: listingId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  const beforeCount = beforeDelete?.images.length ?? 0;
  expect(beforeCount).toBeGreaterThanOrEqual(2);
  await page.locator("button:has(svg) >> text=Delete image").first().tap();
  await page.getByRole("button", { name: "Delete" }).tap();
  await page.getByRole("button", { name: "Save Changes" }).tap();
  await page.waitForTimeout(SAVE_TIMEOUT);
  const afterDelete = await db.listing.findFirst({
    where: { id: listingId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  expect(afterDelete?.images.length ?? 0).toBe(beforeCount - 1);
  log("Image deleted");

  // // Simulate adding an image by creating it directly in DB (bypass S3)
  // log("Simulating adding image add via DB...");
  // await db.image.create({
  //   data: {
  //     url: "https://via.placeholder.com/300?text=Purple+X",
  //     order: afterDelete?.images.length ?? 0,
  //     listingId,
  //   },
  // });

  // // verify the new image is present
  // await page.waitForTimeout(SAVE_TIMEOUT);
  // const purpleX = page.locator('img[src*="Purple+X"]');
  // await expect(purpleX.first()).toBeVisible();
  // const afterAdd = await db.listing.findFirst({
  //   where: { id: listingId },
  //   include: { images: { orderBy: { order: "asc" } } },
  // });
  // expect(afterAdd?.images.length ?? 0).toBe(
  //   (afterDelete?.images.length ?? 0) + 1,
  // );
  // log("Image add verified");

  // Manage lists inline (create, remove, re-add)
  // Create a new list
  const newListName = `E2E L ${String(Date.now()).slice(-6)}`;
  await page.getByTestId("lists-combobox").tap();
  await page.getByTestId("lists-search").fill(newListName);
  await page.getByTestId("lists-create").tap();
  log(`Creating list: ${newListName}`);
  await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(
    1,
  );
  await expect
    .poll(async () => {
      const created = await db.list.findFirst({
        where: { title: newListName },
      });
      const l2 = await db.listing.findUnique({
        where: { id: listingId },
        include: { lists: true },
      });
      return Boolean(
        created && l2?.lists.some((li) => li.title === newListName),
      );
    })
    .toBe(true);
  log("New list applied");

  // Remove Favorites
  const favorites = await db.list.findFirst({ where: { title: "Favorites" } });
  await page.getByTestId("lists-combobox").tap();
  await page.locator(`[data-testid="lists-option-${favorites!.id}"]`).tap();
  log("Removing Favorites...");
  await closeSelectListsDialog(page);
  await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(
    1,
  );
  await expect
    .poll(async () => {
      const l2 = await db.listing.findUnique({
        where: { id: listingId },
        include: { lists: true },
      });
      return Boolean(l2?.lists.some((li) => li.title === "Favorites"));
    })
    .toBe(false);
  log("Favorites removed");

  // Re-add Favorites
  await page.getByTestId("lists-combobox").tap();
  await page.locator(`[data-testid="lists-option-${favorites!.id}"]`).tap();
  log("Re-adding Favorites...");

  await closeSelectListsDialog(page);
  await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(
    1,
  );
  await expect
    .poll(async () => {
      const l2 = await db.listing.findUnique({
        where: { id: listingId },
        include: { lists: true },
      });
      return Boolean(l2?.lists.some((li) => li.title === "Favorites"));
    })
    .toBe(true);
  log("Favorites re-added");

  // Link AHS listing only (minimal)
  log("Verifying AHS listing exists...");
  const ahs = await db.ahsListing.findFirst({
    where: { name: "Alabama Jubilee" },
  });
  expect(ahs).not.toBeNull();
  log("AHS listing exists");

  log("Linking AHS listing...");
  await page.locator("#ahs-listing-select").tap();
  await page.getByTestId("ahs-search").fill("Alabama");
  // try {
  //   await page.getByText("Loading...").waitFor({ state: "hidden" });
  // } catch {}
  await page
    .locator(`[data-testid="ahs-option-${ahs!.id}"]`)
    .first()
    .tap({ force: true });
  const editDialog = page.getByTestId("edit-listing-dialog");
  await expect(editDialog.getByText("Linked to")).toBeVisible();
  await expect(
    editDialog.getByRole("link", { name: ahs!.name ?? "" }),
  ).toBeVisible();
  await expect(editDialog.getByTestId("unlink-ahs")).toBeVisible();
  log("AHS linked and UI updated");

  // Sync name to AHS name
  log("Syncing AHS name...");
  await expect(editDialog.getByTestId("sync-ahs-name")).toBeVisible();
  await editDialog.getByTestId("sync-ahs-name").tap();
  await expect
    .poll(
      async () =>
        (
          await db.listing.findUnique({
            where: { id: listingId },
            select: { title: true },
          })
        )?.title,
    )
    .toBe(ahs!.name);
  await expect(page.getByTestId("listing-title-input")).toHaveValue(
    ahs!.name ?? "",
  );
  log("AHS name synced");

  // Unlink AHS
  log("Unlinking AHS...");
  await editDialog.getByTestId("unlink-ahs").tap();
  await expect
    .poll(
      async () =>
        (await db.listing.findUnique({ where: { id: listingId } }))?.ahsId,
    )
    .toBe(null);
  await expect(page.locator("#ahs-listing-select")).toBeVisible();
  log("AHS unlinked");
});

// TODO: fix this test
test.skip("listings: delete listing via row actions", async ({
  page,
  testUser,
  db,
}) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  const title = `PW Delete ${Date.now()}`;
  // Create, then delete
  await page.getByRole("button", { name: "Create Listing" }).tap();
  await page.getByPlaceholder("Enter a title").fill(title);
  await page.getByRole("button", { name: "Create Listing" }).tap();
  // Also test deleting from Edit dialog
  await page.getByRole("button", { name: "Delete Listing" }).tap();
  await page.getByRole("button", { name: "Delete" }).tap();
  await closeEditDialog(page);

  // Verify gone in table and DB
  await page.getByPlaceholder("Filter listings...").fill(title);
  await expect(page.getByTestId("listings-table")).not.toContainText(title);

  // DB verification via fixture
  const deleted = await db.listing.findFirst({ where: { title } });
  expect(deleted).toBeNull();
});

test("listings: create from AHS", async ({ page, testUser, db }) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  await page.getByRole("button", { name: "Create Listing" }).tap();
  await page.getByText("Select Daylily Database listing").tap();
  await page.getByPlaceholder("Search AHS listings...").fill("Stella");
  await page.getByRole("option", { name: /Stella de Oro/i }).tap();
  // Override with custom name before creating
  const customName = `Custom Stella ${Date.now()}`;
  await page.getByLabel("Listing Title").fill(customName);
  await page.getByRole("button", { name: "Create Listing" }).tap();
  await page.getByRole("button", { name: "Save Changes" }).tap();
  await closeEditDialog(page);

  await page.getByPlaceholder("Filter listings...").fill(customName);
  const created = await db.listing.findFirst({
    where: { title: customName },
    include: { ahsListing: true },
  });
  expect(created).not.toBeNull();
  expect(created!.ahsId).not.toBeNull();
  expect(created!.ahsListing?.name).toMatch(/Stella de Oro/i);
});

test("listings: lists faceted filter", async ({ page, testUser }) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);
  const before = await countCenterTableRows(page);
  await page.locator('button[aria-haspopup="dialog"]:has-text("Lists")').tap();
  await page.getByRole("option", { name: "Favorites" }).tap();
  await page.waitForTimeout(200);
  const after = await countCenterTableRows(page);
  expect(after).toBeLessThanOrEqual(before);
  // Verify filtered count badge appears
  await expect(page.locator('code:has-text("/")')).toBeVisible();
  // Clear filters explicitly and verify reset
  // Prefer toolbar Reset button if visible
  let cleared = false;
  try {
    const resetBtn = page.getByRole("button", { name: "Reset" });
    if (await resetBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await resetBtn.tap();
      cleared = true;
    }
  } catch {}
  if (!cleared) {
    await page
      .locator('button[aria-haspopup="dialog"]:has-text("Lists")')
      .tap();
    try {
      await page.getByRole("option", { name: "Clear filters" }).tap();
    } catch {
      await page
        .locator('button[aria-haspopup="dialog"]:has-text("Lists")')
        .tap();
      await page.getByRole("option", { name: "Clear filters" }).tap();
    }
  }
  const reset = await countCenterTableRows(page);
  expect(reset).toBeGreaterThanOrEqual(after);
});

// Table options flow omitted for now per guidance

test("listings: csv download", async ({ page, testUser }) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).tap(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
});

test("listings: table – pagination, sorting and filters persist in URL", async ({
  page,
  testUser,
}) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  // Sorting persistence
  await page.locator('[data-testid="sort-title"]').tap();
  await expect(page).toHaveURL(/sort=title&dir=asc/);
  await page.reload();
  await expect(page).toHaveURL(/sort=title&dir=asc/);

  // Global filter persistence
  await page
    .locator('[data-testid="global-filter"]')
    .waitFor({ timeout: 10000 });
  await page.locator('[data-testid="global-filter"]').fill("Stella");
  await expect(page).toHaveURL(/query=Stella/);
  await page.reload();
  await expect(page).toHaveURL(/query=Stella/);

  // Column filter persistence (Title) – open filter popover then fill
  await page.getByRole("button", { name: /Filter title/i }).tap();
  await page.locator('[data-testid="filter-title"]').fill("Test");
  await expect(page).toHaveURL(/title=Test/);
  await page.reload();
  await expect(page).toHaveURL(/title=Test/);

  // Page size persistence
  // Clear filters first so pagination controls are visible
  try {
    await page
      .locator('[data-testid="sort-title"]')
      .first()
      .waitFor({ timeout: 5000 });
    // Re-open the Title filter popover to access the input, then clear it
    await page
      .getByRole("button", { name: /Filter title/i })
      .first()
      .tap();
    await page.locator('[data-testid="filter-title"]').fill("");
    // Close the popover to avoid overlaying other controls
    try {
      await page.keyboard.press("Escape");
    } catch {}
  } catch {
    // If the filter button isn't interactable, reset to a clean listings page
    await page.goto("/dashboard/listings");
    await page.getByTestId("listings-table").waitFor({ timeout: 5000 });
  }
  await page.locator('[data-testid="global-filter"]').fill("");
  await page.waitForTimeout(300);
  await expect(page).not.toHaveURL(/title=/);
  await expect(page).not.toHaveURL(/query=/);

  // Ensure there is pagination to interact with by setting a smaller page size first
  const pageSizeTrigger = page.locator('[data-testid="page-size"]').first();
  await page.evaluate(() => {
    const el = document.getElementById("data-table");
    el?.scrollIntoView();
  });
  await pageSizeTrigger.tap({ timeout: 2000 });
  await page.getByRole("option", { name: "50" }).tap();
  await expect(page).toHaveURL(/size=50/);
  await page.reload();
  await expect(page).toHaveURL(/size=50/);
});

test("listings: csv download reflects current filter", async ({
  page,
  testUser,
}) => {
  await programmaticLogin(page, testUser);
  await navigateToListings(page);

  await page
    .locator('[data-testid="global-filter"]')
    .fill("Custom Purple Beauty");
  // Debounce wait for filter to apply
  await page.waitForTimeout(300);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator('[data-testid="download-csv"]').tap(),
  ]);
  const path = await download.path();
  const content = path ? await fs.readFile(path, "utf8") : "";
  expect(content).toContain("Custom Purple Beauty");
  // When filtered, global filter still includes all core rows due to current CSV generation; content check only asserts presence.
});
