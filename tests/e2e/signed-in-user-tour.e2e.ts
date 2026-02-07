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
    await page.goto("/dashboard/listings");
    await expect(page).toHaveURL("/dashboard/listings");
    await expect(
      page.getByRole("heading", { name: "Listings" }),
    ).toBeVisible();

    // Lists page
    await page.goto("/dashboard/lists");
    await expect(page).toHaveURL("/dashboard/lists");
    await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();

    // List detail page (use the seeded list ID)
    await page.goto(`/dashboard/lists/${testListId}`);
    await expect(page).toHaveURL(`/dashboard/lists/${testListId}`);
    await expect(
      page.getByRole("heading", { name: /Tour Test List/ }),
    ).toBeVisible();

    // Profile page
    await page.goto("/dashboard/profile");
    await expect(page).toHaveURL("/dashboard/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  });
});
