import { test, expect } from "@playwright/test";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";

test.describe("guest user tour @preview", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const userId = "3";
      await db.user.create({ data: { id: userId } });
      await db.userProfile.create({
        data: {
          userId,
          title: "RollingOaksDaylilies",
          slug: "rollingoaksdaylilies",
          description: "Seeded profile for E2E",
        },
      });
      await db.listing.create({
        data: {
          id: "221",
          userId,
          title: "Coffee Frenzy",
          slug: "coffee-frenzy",
        },
      });
    });
  });

  test("navigates through unauthed pages", async ({ page }) => {
    // Home page
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Daylily Catalog");

    // Catalogs page
    await page.goto("/catalogs");
    await expect(page).toHaveURL("/catalogs");
    await expect(page).toHaveTitle("Browse Daylily Catalogs | Daylily Catalog");

    // User's catalog (by ID)
    await page.goto("/3");
    await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");

    // User's catalog (by slug)
    await page.goto("/rollingoaksdaylilies");
    await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");

    // User's listing page (by ID)
    await page.goto("/3/221");
    await expect(page).toHaveTitle("Coffee Frenzy Daylily | RollingOaksDaylilies");

    // User's listing page (by slug)
    await page.goto("/rollingoaksdaylilies/coffee-frenzy");
    await expect(page).toHaveTitle("Coffee Frenzy Daylily | RollingOaksDaylilies");
  });
});
