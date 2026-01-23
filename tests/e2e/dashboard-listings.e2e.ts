import { test, expect } from "@playwright/test";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER, createAuthedUser } from "../../src/lib/test-utils/e2e-users";
import { clerk } from "@clerk/testing/playwright";

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
  color: "Yellow with red eye",
  form: "Single",
  ahsImageUrl: "https://placehold.co/400",
  fragrance: "Fragrant",
  budcount: "20",
  branches: "3",
} as const;

test.describe("dashboard listings @local", () => {
  test("create + edit listing flow", async ({ page }) => {
    await withTempE2EDb(async (db) => {
      await createAuthedUser(db);
      await db.ahsListing.create({
        data: TEST_AHS_DATA,
      });
    });

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.goto("/dashboard/listings");

    await expect(
      page.getByRole("heading", { name: "No listings" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Create Listing" }).first().click();

    await page.getByRole("combobox").click();
    await page.getByPlaceholder("Search AHS listings...").fill("coffee");
    await page.getByRole("option", { name: /Coffee Frenzy/i }).click();

    await expect(page.getByLabel("Listing Title")).toHaveValue("Coffee Frenzy");

    await page.getByLabel("Listing Title").click();
    await page.getByLabel("Listing Title").fill("Coffee Frenzy renamed");

    await page.getByRole("button", { name: "Create Listing" }).click();

    await expect(page).toHaveURL(/editing=/);

    await page.getByRole("button", { name: "Close" }).click();

    await expect(
      page.locator("#data-table").getByText("Coffee Frenzy renamed"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: /delete/i }).click();

    await expect(
      page.getByRole("heading", { name: "No listings" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("listing table displays correctly with data", async ({ page }) => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);
      await db.listing.create({
        data: {
          userId: user.id,
          title: "Test Daylily",
          slug: "test-daylily",
          description: "A beautiful test daylily",
          price: 25,
          privateNote: "Note for me",
        },
      });
    });

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.goto("/dashboard/listings");

    const table = page.locator("#data-table");
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByRole("cell", { name: "Test Daylily", exact: true })).toBeVisible({ timeout: 10000 });
  });
});
