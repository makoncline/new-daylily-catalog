import { test, expect } from "../../e2e/test-setup";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER, createAuthedUser } from "../../src/lib/test-utils/e2e-users";
import { clerk } from "@clerk/testing/playwright";

test.describe("signed-in user tour @local", () => {
  let testListId: string;

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);

      // Create a listing for the listings page
      await db.listing.create({
        data: {
          userId: user.id,
          title: "Tour Test Daylily",
          slug: "tour-test-daylily",
        },
      });

      // Create a list for the list detail page
      const list = await db.list.create({
        data: {
          userId: user.id,
          title: "Tour Test List",
        },
      });
      testListId = list.id;

      // Create a listing and connect it to the list (many-to-many)
      await db.listing.create({
        data: {
          userId: user.id,
          title: "Listed Daylily",
          slug: "listed-daylily",
          lists: {
            connect: { id: list.id },
          },
        },
      });
    });
  });

  test("visits all dashboard routes successfully", async ({ page }) => {
    // Sign in
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    // Dashboard home
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Listings page
    await page.getByTestId("dashboard-nav-listings").click();
    await expect(page).toHaveURL("/dashboard/listings");
    await expect(
      page.getByRole("heading", { name: "Listings" }),
    ).toBeVisible();

    // Lists page
    await page.getByTestId("dashboard-nav-lists").click();
    await expect(page).toHaveURL("/dashboard/lists");
    await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();

    // List detail page (navigate via row actions -> Manage)
    await page.getByPlaceholder("Filter lists...").fill("Tour Test List");
    await expect(page).toHaveURL(/\/dashboard\/lists\?query=Tour\+Test\+List/);
    await expect(page.getByTestId("list-table")).toContainText("Tour Test List");

    await page.getByTestId("list-row-actions-trigger").first().click();
    const manageItem = page.getByTestId("list-row-action-manage");
    await expect(manageItem).toBeVisible();
    await Promise.all([
      page.waitForURL(`/dashboard/lists/${testListId}`, {
        waitUntil: "domcontentloaded",
      }),
      manageItem.click(),
    ]);

    await expect(
      page.getByRole("heading", { name: /Tour Test List/ }),
    ).toBeVisible();

    // Profile page
    await page.getByTestId("dashboard-nav-profile").click();
    await expect(page).toHaveURL("/dashboard/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  });
});
