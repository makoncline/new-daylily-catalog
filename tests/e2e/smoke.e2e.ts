import { test, expect } from "@playwright/test";

/**
 * Smoke tests that run in both local and attach modes.
 * These tests verify basic app functionality without requiring seeded data.
 * NOT tagged @local - will run with `test:e2e:attach` against deployed environments.
 */
test.describe("smoke @smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Daylily Catalog");
  });

  test("catalogs page loads", async ({ page }) => {
    await page.goto("/catalogs");
    await expect(page).toHaveTitle(/Catalogs/i);
  });

  test("sign-in modal appears", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dashboard" }).click();
    // Clerk sign-in modal should appear
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10000 });
  });
});
