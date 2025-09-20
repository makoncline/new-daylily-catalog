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

test.beforeAll(async () => {
  await withTempE2EDb(async (db) => {
    await createAuthedUser(db);
    await db.ahsListing.create({
      data: TEST_AHS_DATA,
    });
  });
});

test("dashboard-two listings: create + edit listing flow", async ({
  page,
}, testInfo) => {
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
