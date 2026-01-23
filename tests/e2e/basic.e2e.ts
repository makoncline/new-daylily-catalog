import { test, expect } from "@playwright/test";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";

test.describe("public pages @local", () => {
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

  test("public page smoke test", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Daylily Catalog");

    await page.goto("/catalogs");
    await expect(page).toHaveURL("/catalogs");
    await expect(page).toHaveTitle("Browse Daylily Catalogs | Daylily Catalog");

    await page.goto("/3");
    await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");
    await page.goto("/rollingoaksdaylilies");
    await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");

    const expectedTitle = "Coffee Frenzy Daylily | RollingOaksDaylilies";

    await page.goto("/3/221");
    await expect(page).toHaveTitle(expectedTitle);
    await page.goto("/3/coffee-frenzy");
    await expect(page).toHaveTitle(expectedTitle);
    await page.goto("/rollingoaksdaylilies/221");
    await expect(page).toHaveTitle(expectedTitle);
    await page.goto("/rollingoaksdaylilies/coffee-frenzy");
    await expect(page).toHaveTitle(expectedTitle);
  });
});
