import { test, expect } from "@playwright/test";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  TEST_USER,
  createAuthedUser,
} from "../../src/lib/test-utils/e2e-users";
import { clerk } from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await withTempE2EDb(async (db) => {
    await createAuthedUser(db);
    await db.ahsListing.create({
      data: {
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
      },
    });
  });
});

test("dashboard-two listings page has title", async ({ page }) => {
  // Load a page that initializes Clerk
  await page.goto("/");

  // Sign in using Clerk testing helpers with our pre-created dev user
  await clerk.signIn({ page, emailAddress: TEST_USER.email });

  // Navigate to the listings page
  await page.goto("/dashboard-two/listings");

  // Assert the document title (inherits from app root layout)
  await expect(page).toHaveTitle("Daylily Catalog");
});

test("dashboard-two listings: create + edit listing flow", async ({
  page,
}, testInfo) => {
  // Load a page that initializes Clerk
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_USER.email });
  await page.goto("/dashboard-two/listings");

  // Create a listing via dialog
  await page.getByRole("button", { name: "Create Listing" }).click();

  // linked AHS card should not be shown before linking
  await expect(page.getByTestId("linked-ahs-card")).toHaveCount(0);

  // Click daylily database listing: search and pick Coffee Frenzy
  await page.getByLabel(/AHS Database Listing/).fill("coffee");
  await page.getByRole("listitem").filter({ hasText: "Coffee Frenzy" }).click();

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
  await page.getByRole("button", { name: "Close" }).last().click();

  // Check the name of the listing in the listings table (scope to table to avoid toast)
  await expect(
    page.locator("#data-table").getByText("Coffee Frenzy renamed"),
  ).toBeVisible();

  // Debug: capture DOM and screenshot for next step planning
  const html = await page.content();
  await testInfo.attach("dom.html", { body: html, contentType: "text/html" });
  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach("page.png", { body: shot, contentType: "image/png" });
});
