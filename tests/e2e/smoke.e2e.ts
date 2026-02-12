import { test, expect } from "../../e2e/test-setup";

test.describe("guest user tour @preview", () => {
  test("navigates through unauthed pages", async ({ page }) => {
    // Home page
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Daylily Catalog");

    // Catalogs page
    await page.goto("/catalogs");
    await expect(page).toHaveURL("/catalogs");
    await expect(page).toHaveTitle("Browse Daylily Catalogs | Daylily Catalog");

    // Open first catalog from the grid
    const firstCatalogLink = page
      .locator("div.grid")
      .first()
      .locator("a[href^='/']")
      .first();
    await expect(firstCatalogLink).toBeVisible();
    await firstCatalogLink.click();
    await expect(page).toHaveURL(/\/[^/]+$/);

    // Open first listing card (opens dialog)
    const firstListingCard = page
      .locator("#listings")
      .locator("div.group.relative")
      .first();
    await expect(firstListingCard).toBeVisible();
    await firstListingCard.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Navigate to cultivar page from dialog
    const listingPageLink = page.getByRole("link", {
      name: "View Cultivar Page",
    });
    await expect(listingPageLink).toBeVisible();
    await listingPageLink.click();

    // Cultivar page should render a main heading
    await page.waitForURL(/\/cultivar\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
