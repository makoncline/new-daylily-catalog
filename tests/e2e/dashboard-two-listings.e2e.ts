import { test, expect } from "@playwright/test";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  TEST_USER,
  createAuthedUser,
} from "../../src/lib/test-utils/e2e-users";
import { clerk } from "@clerk/testing/playwright";

// Test data for AHS listing
const TEST_AHS_DATA = {
  id: "176320",
  name: "Coffee Frenzy",
  hybridizer: "Cline",
  year: "2020",
  scapeHeight: "24 in",
  bloomSize: "5.5 in",
  bloomSeason: "Mid",
  ploidy: "Diploid",
  foliageType: "Dormant",
  bloomHabit: "Diurnal",
  seedlingNum: "CF-001",
  color: "Yellow with red eye",
  form: "Single",
  parentage: "Parent A × Parent B",
  ahsImageUrl: "https://placehold.co/400",
  fragrance: "Fragrant",
  budcount: "20",
  branches: "3",
  sculpting: "None",
  foliage: "Healthy",
  flower: "Round",
} as const;

// Test data for listing edits
const TEST_EDIT_DATA = {
  name: "new name",
  description: "this is a description",
  price: 35,
  status: "Hidden",
  privateNote: "this is a private note",
  listName: "new list",
} as const;

test("dashboard-two listings: create + edit listing flow", async ({ page }) => {
  await withTempE2EDb(async (db) => {
    await createAuthedUser(db);
    await db.ahsListing.create({
      data: TEST_AHS_DATA,
    });
  });
  // Load a page that initializes Clerk
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_USER.email });
  await page.goto("/dashboard-two/listings");
  // wait for the page to load
  await expect(
    page.getByRole("heading", { name: "No listings" }),
  ).toBeVisible();

  // Create a listing via dialog
  await page.getByRole("button", { name: "Create Listing" }).click();

  // linked AHS card should not be shown before linking
  await expect(page.getByTestId("linked-ahs-card")).not.toBeVisible();

  // await page.pause();
  await page.getByRole("combobox", { name: "Select AHS listing" }).click();
  await page.getByPlaceholder("Search AHS listings...").fill("coffee");
  await page.getByRole("option", { name: "Coffee Frenzy" }).click();

  // linked AHS card should now be visible and contain the correct title
  const linkedCard = page.getByTestId("linked-ahs-card");
  await expect(linkedCard).toBeVisible();
  await expect(linkedCard).toContainText("Coffee Frenzy");

  // Check that the listing title synced with AHS listing name
  await expect(page.getByLabel("Listing Title")).toHaveValue("Coffee Frenzy");

  // Change the name of the listing
  await page.getByLabel("Listing Title").click();
  await page.getByLabel("Listing Title").fill("Coffee Frenzy renamed");

  // Finalize creation
  await page.getByRole("button", { name: "Create Listing" }).click();

  // Check the url for the ?editing= parameter
  await expect(page).toHaveURL(/editing=/);

  // Close the edit listing dialog
  await page.getByRole("button", { name: "Close" }).nth(1).click();

  // Check the name of the listing in the listings table (scope to table to avoid toast)
  await expect(
    page.locator("#data-table").getByText("Coffee Frenzy renamed"),
  ).toBeVisible();

  // Edit the listing
  // from codegen and not tested blow this comment
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  // edit listing fields. should save these in an obj so we can verify
  // Edit listing fields using test data
  await page.getByRole("textbox", { name: "Name" }).click();
  // TODO: add a clear button, with x icon, to the right inside the input
  // this was me selecting all and then typing new name
  await page
    .getByRole("textbox", { name: "Name" })
    .press("ControlOrMeta+Shift+ArrowLeft");
  await page.getByRole("textbox", { name: "Name" }).fill(TEST_EDIT_DATA.name);

  await page.getByRole("textbox", { name: "Description" }).click();
  await page
    .getByRole("textbox", { name: "Description" })
    .fill(TEST_EDIT_DATA.description);

  await page.getByRole("spinbutton", { name: "Price" }).click();
  // TODO: make the price whole numbers only
  await page
    .getByRole("spinbutton", { name: "Price" })
    .fill(TEST_EDIT_DATA.price.toString());

  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: TEST_EDIT_DATA.status }).click();

  await page.getByRole("textbox", { name: "Private Notes" }).click();
  await page
    .getByRole("textbox", { name: "Private Notes" })
    .fill(TEST_EDIT_DATA.privateNote);

  await page.getByRole("combobox", { name: "Select lists" }).click();
  await page.getByPlaceholder("Search lists...").fill(TEST_EDIT_DATA.listName);
  await page.getByText(`Create "${TEST_EDIT_DATA.listName}"`).click();
  // close edit listing dialog
  await page.getByRole("button", { name: "Close" }).nth(1).click();
  // Verify all fields in table have been updated correctly with specific column targeting
  // Verify image column has the AHS image
  const imageCell = page.locator("#data-table [data-column='images']");
  const imageElement = imageCell.locator("img").first();
  await expect(imageElement).toBeAttached(); // Check it exists in DOM
  await expect(imageElement).toHaveAttribute(
    "src",
    new RegExp(TEST_AHS_DATA.ahsImageUrl),
  );

  // Verify title column has the edited name
  await expect(
    page
      .locator("#data-table [data-column='title']")
      .getByText(TEST_EDIT_DATA.name),
  ).toBeVisible();

  // Verify price column has the edited price
  await expect(
    page
      .locator("#data-table [data-column='price']")
      .getByText(`$${TEST_EDIT_DATA.price}`),
  ).toBeVisible();

  // Verify description column has the edited description
  await expect(
    page
      .locator("#data-table [data-column='description']")
      .getByText(TEST_EDIT_DATA.description),
  ).toBeVisible();

  // Verify private note (might be in a different column or handled differently)
  await expect(
    page.locator("#data-table").getByText(TEST_EDIT_DATA.privateNote),
  ).toBeVisible();

  // Verify the list badge contains the expected list name
  const listBadge = page
    .locator("#data-table [data-slot='badge']")
    .filter({ hasText: TEST_EDIT_DATA.listName });
  await expect(listBadge).toBeVisible();

  // Verify status column has the edited status
  await expect(
    page
      .locator("#data-table [data-column='status']")
      .getByText(TEST_EDIT_DATA.status),
  ).toBeVisible();
  // Verify AHS database fields are displayed correctly in their specific columns
  await expect(
    page
      .locator("#data-table [data-column='summary']")
      .getByText(
        `${TEST_AHS_DATA.name} (${TEST_AHS_DATA.hybridizer}, ${TEST_AHS_DATA.year}),`,
      ),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='hybridizer']")
      .getByText(TEST_AHS_DATA.hybridizer, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='year']")
      .getByText(TEST_AHS_DATA.year, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='scapeHeight']")
      .getByText(TEST_AHS_DATA.scapeHeight, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='bloomSize']")
      .getByText(TEST_AHS_DATA.bloomSize, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='bloomSeason']")
      .getByText(TEST_AHS_DATA.bloomSeason, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='ploidy']")
      .getByText(TEST_AHS_DATA.ploidy, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='foliageType']")
      .getByText(TEST_AHS_DATA.foliageType, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='color']")
      .getByText(TEST_AHS_DATA.color, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='form']")
      .getByText(TEST_AHS_DATA.form, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='fragrance']")
      .getByText(TEST_AHS_DATA.fragrance),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='budcount']")
      .getByText(TEST_AHS_DATA.budcount, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#data-table [data-column='branches']")
      .getByText(TEST_AHS_DATA.branches, { exact: true }),
  ).toBeVisible();
  // delete listing
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  // verify listing is deleted
  await page.getByRole("heading", { name: "No listings" }).click();
});

test("dashboard-two listings: filter listings", async ({ page }) => {
  await withTempE2EDb(async (db) => {
    const user = await createAuthedUser(db);

    // Create multiple AHS listings with different data for comprehensive testing
    const ahs1 = await db.ahsListing.create({
      data: { ...TEST_AHS_DATA, hybridizer: "Smith", year: "2020" },
    });
    const ahs2 = await db.ahsListing.create({
      data: {
        ...TEST_AHS_DATA,
        id: "ahs002",
        name: "Stella d'Oro",
        hybridizer: "Stout",
        year: "1975",
      },
    });
    const ahs3 = await db.ahsListing.create({
      data: {
        ...TEST_AHS_DATA,
        id: "ahs003",
        name: "Happy Returns",
        hybridizer: "Pierce",
        year: "1986",
      },
    });

    // Create listings with varied data for comprehensive filter testing
    await db.listing.create({
      data: {
        userId: user.id,
        title: "Morning Glory",
        slug: "morning-glory",
        description:
          "A beautiful morning blooming flower with excellent fragrance",
        price: 25,
        ahsId: ahs1.id,
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: "Evening Star",
        slug: "evening-star",
        description: "Late blooming variety with striking colors",
        price: 35,
        ahsId: ahs2.id,
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: "Sunshine Delight",
        slug: "sunshine-delight",
        description: "Bright yellow flowers that bloom all day",
        price: 45,
        privateNote: "Customer favorite - always sells quickly",
        ahsId: ahs3.id,
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: "Midnight Blue",
        slug: "midnight-blue",
        description: "Deep purple blooms with excellent rebloom",
        price: 30,
        privateNote: "Hardy variety, good for beginners",
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: "Raspberry Swirl",
        slug: "raspberry-swirl",
        description: "Pink and white swirled petals",
        price: 40,
      },
    });

    // Create some lists for list filtering
    const gardenList = await db.list.create({
      data: {
        userId: user.id,
        title: "Garden Collection",
      },
    });

    const premiumList = await db.list.create({
      data: {
        userId: user.id,
        title: "Premium Varieties",
      },
    });

    // Associate some listings with lists
    await db.listing.update({
      where: { userId_slug: { userId: user.id, slug: "morning-glory" } },
      data: {
        lists: {
          connect: [{ id: gardenList.id }],
        },
      },
    });

    await db.listing.update({
      where: { userId_slug: { userId: user.id, slug: "sunshine-delight" } },
      data: {
        lists: {
          connect: [{ id: premiumList.id }],
        },
      },
    });

    // Verify the association was created correctly
    const morningGlory = await db.listing.findUnique({
      where: { userId_slug: { userId: user.id, slug: "morning-glory" } },
      include: { lists: true },
    });
  });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_USER.email });
  await page.goto("/dashboard-two/listings");

  // await page.pause();

  // ===== HELPER FUNCTIONS =====
  const titlesLocator = page.locator("#data-table [data-column='title']");
  const getTitles = async () =>
    (await titlesLocator.allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);

  // Derive TOTAL from the UI to avoid coupling to the seeded count.
  const countEl = page.getByTestId("filtered-rows-count");
  // Ensure the element is visible and has the expected pattern before parsing.
  await expect(countEl).toBeVisible();
  await expect(countEl).toHaveText(/\d+\s*\/\s*\d+/);
  const TOTAL = Number(
    /\d+\s*\/\s*(\d+)/.exec((await countEl.textContent()) || "")?.[1],
  );
  expect(Number.isFinite(TOTAL)).toBeTruthy();

  async function expectFilteredCount(n: number) {
    await expect(page.getByTestId("filtered-rows-count")).toHaveText(
      new RegExp(`^${n}\\s*/\\s*${TOTAL}$`),
    );
  }

  async function expectNonZeroCount() {
    await expect(page.getByTestId("filtered-rows-count")).not.toHaveText(
      new RegExp(`^0\\s*/\\s*${TOTAL}$`),
    );
  }

  async function expectTitles(expected: string[]) {
    const actual = await getTitles();
    expect([...actual].sort()).toEqual([...expected].sort());
  }

  async function resetAllFiltersIfVisible() {
    const resetBtn = page.getByText("Reset");
    if (await resetBtn.isVisible({ timeout: 2000 })) {
      await resetBtn.click({ timeout: 5000 });
      // Wait for filters to actually reset
      await page.waitForTimeout(100);
    }
    await expectFilteredCount(TOTAL);
  }

  // Verify we have TOTAL listings total
  await expectFilteredCount(TOTAL);

  async function setGlobalFilter(value: string) {
    await page.getByRole("textbox", { name: "Filter listings..." }).fill(value);
  }

  async function clearGlobalFilter() {
    await page.getByRole("textbox", { name: "Filter listings..." }).clear();
  }

  async function setColFilter(label: string, value: string) {
    // Click the column header search button (not the faceted filter)
    // The sr-only text creates the button name as "Filter {Title}"
    const title = label === "lists" ? "Lists" : label; // Capitalize for proper title case
    await page
      .getByRole("button", { name: new RegExp(`Filter ${title}`, "i") })
      .click();
    await page
      .getByRole("textbox", {
        name: new RegExp(`Filter ${title}\\.\\.\\.`, "i"),
      })
      .fill(value);
  }

  async function clearColFilter(label: string) {
    const title = label === "lists" ? "Lists" : label; // Capitalize for proper title case
    // Open the popover first
    await page
      .getByRole("button", { name: new RegExp(`Filter ${title}`, "i") })
      .click();
    await page
      .getByRole("textbox", {
        name: new RegExp(`Filter ${title}\\.\\.\\.`, "i"),
      })
      .clear();
    // Close the popover
    await page.keyboard.press("Escape");
    // Small wait for popover to close
    await page.waitForTimeout(100);
    // Assert it actually closed before proceeding
    await expect(
      page.getByRole("button", { name: new RegExp(`Filter ${title}`, "i") }),
    ).toHaveAttribute("aria-expanded", "false");
  }

  // ===== GLOBAL FILTER TESTS =====
  await test.step("Global filter: title finds Morning Glory", async () => {
    await setGlobalFilter("Morning");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
  });

  await test.step("Global filter: description finds Morning Glory", async () => {
    await setGlobalFilter("fragrance");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
  });

  await test.step("Global filter: price finds Morning Glory", async () => {
    await setGlobalFilter("25");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
  });

  await test.step("Global filter: hybridizer finds Morning Glory", async () => {
    await setGlobalFilter("Smith");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
  });

  await test.step("Global filter: case insensitive search", async () => {
    await setGlobalFilter("morning");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
  });

  await test.step("Global filter: zero results", async () => {
    await setGlobalFilter("ZZZ-NEVER-MATCH");
    await expectFilteredCount(0);
    await expectTitles([]);
  });

  await test.step("Global filter reset", async () => {
    await clearGlobalFilter();
    await expectFilteredCount(TOTAL);
    await expectTitles([
      "Morning Glory",
      "Evening Star",
      "Sunshine Delight",
      "Midnight Blue",
      "Raspberry Swirl",
    ]);
  });

  // ===== COLUMN-SPECIFIC FILTER TESTS =====

  await test.step("Title column filter: finds Evening Star", async () => {
    await setColFilter("title", "Star");
    await expectFilteredCount(1);
    await expectTitles(["Evening Star"]);
    await clearColFilter("title");
  });

  await test.step("Description column filter: finds listing with purple in description", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("description", "purple");
    await expectFilteredCount(1);
    await expectTitles(["Midnight Blue"]);
    await clearColFilter("description");
  });

  await test.step("Private notes column filter: finds listing with favorite in notes", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("private notes", "favorite");
    await expectFilteredCount(1);
    await expectTitles(["Sunshine Delight"]);
    await clearColFilter("private notes");
  });

  await test.step("AHS name column filter: finds Evening Star", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("Daylily Name", "Stella d'Oro");
    await expectFilteredCount(1);
    await expectTitles(["Evening Star"]);
    await clearColFilter("Daylily Name");
  });

  await test.step("AHS year column filter: finds Evening Star", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("Year", "1975");
    await expectFilteredCount(1);
    await expectTitles(["Evening Star"]);
    await clearColFilter("Year");
  });

  await test.step("Price column filter: finds listing with price 40", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("price", "40");
    await expectFilteredCount(1);
    await expectTitles(["Raspberry Swirl"]);
    await clearColFilter("price");
  });

  await test.step("Hybridizer column filter: finds listing with Pierce hybridizer", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("hybridizer", "Pierce");
    await expectFilteredCount(1);
    await expectTitles(["Sunshine Delight"]);
    await clearColFilter("hybridizer");
  });

  // ===== LISTS FILTER TESTS =====
  await test.step("Lists filter: Garden Collection returns Morning Glory", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("lists", "Garden Collection");
    await expectFilteredCount(1);
    await expectTitles(["Morning Glory"]);
    await clearColFilter("lists");
  });

  await test.step("Lists filter: Premium Varieties returns Sunshine Delight", async () => {
    await resetAllFiltersIfVisible();
    await setColFilter("lists", "Premium Varieties");
    await expectFilteredCount(1);
    await expectTitles(["Sunshine Delight"]);
    await clearColFilter("lists");
  });

  await test.step("Lists filter: accessibility - popover closes with Escape", async () => {
    await resetAllFiltersIfVisible();
    const listsBtn = page.getByRole("button", { name: /filter lists/i });
    await listsBtn.click();
    await expect(
      page.getByRole("textbox", { name: /filter lists\.\.\./i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(listsBtn).toHaveAttribute("aria-expanded", "false");
    await expect(listsBtn).toBeFocused();
  });

  // ===== COMBINED FILTER TESTS =====
  await test.step("Combined filters: Global search + column filter", async () => {
    await setGlobalFilter("bloom");
    await setColFilter("description", "bright");
    await expectFilteredCount(1);
    await expectTitles(["Sunshine Delight"]);

    // Clear both filters
    await clearGlobalFilter();
    await clearColFilter("description");
  });

  // ===== EDGE CASE TESTS =====
  await test.step("Edge case: case insensitive search", async () => {
    await setGlobalFilter("MORNING");
    await expectNonZeroCount();
    // The filter finds listings containing "morning" (case insensitive)
    const titles = await getTitles();
    expect(titles.length).toBeGreaterThan(0);
    await clearGlobalFilter();
  });

  await test.step("Edge case: apostrophe normalization", async () => {
    await resetAllFiltersIfVisible();
    // Straight vs curly apostrophes must both match "Stella d'Oro"
    await setGlobalFilter("d'oro"); // ASCII '
    await expectFilteredCount(1);
    await expectTitles(["Evening Star"]);
    await clearGlobalFilter();

    await setGlobalFilter("d'oro"); // U+2019 ' (literal curly apostrophe)
    await expectFilteredCount(1);
    await expectTitles(["Evening Star"]);
    await clearGlobalFilter();
  });

  await test.step("Edge case: numeric boundary cases", async () => {
    // Test price with leading/trailing whitespace
    await setColFilter("price", " 40 ");
    await expectNonZeroCount();
    const titles1 = await getTitles();
    expect(titles1.length).toBeGreaterThan(0);
    await clearColFilter("price");

    // Test price with currency symbol (if supported)
    await setColFilter("price", "$40");
    await expectNonZeroCount();
    const titles2 = await getTitles();
    expect(titles2.length).toBeGreaterThan(0);
    await clearColFilter("price");
  });

  await test.step("Edge case: partial matches in description", async () => {
    await setGlobalFilter("excellent");
    await expectNonZeroCount();
    const titles = await getTitles();
    expect(titles.length).toBeGreaterThan(0);
    await clearGlobalFilter();
  });

  await test.step("Edge case: no matches found", async () => {
    await setGlobalFilter("NONEXISTENT-SEARCH-TERM");
    await expectFilteredCount(0);
    await expectTitles([]);
    await clearGlobalFilter();
  });
});
