import { test, expect } from "@playwright/test";

test("public page smoke test", async ({ page }) => {
  // Check home page
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Daylily Catalog");

  // Check catalogs page
  await page.goto("/catalogs");
  await expect(page).toHaveURL("/catalogs");
  await expect(page).toHaveTitle("Browse Daylily Catalogs | Daylily Catalog");

  // Check catalog page
  // by user id
  await page.goto("/3");
  await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");
  await page.goto("/rollingoaksdaylilies");
  await expect(page).toHaveTitle("RollingOaksDaylilies | Daylily Catalog");

  // Check listing page
  await page.goto("/3/221");
  await expect(page).toHaveTitle(
    "Coffee Frenzy Daylily | RollingOaksDaylilies",
  );
  await page.goto("/3/coffee-frenzy");
  await expect(page).toHaveTitle(
    "Coffee Frenzy Daylily | RollingOaksDaylilies",
  );
  await page.goto("/rollingoaksdaylilies/221");
  await expect(page).toHaveTitle(
    "Coffee Frenzy Daylily | RollingOaksDaylilies",
  );
  await page.goto("/rollingoaksdaylilies/coffee-frenzy");
  await expect(page).toHaveTitle(
    "Coffee Frenzy Daylily | RollingOaksDaylilies",
  );
});
