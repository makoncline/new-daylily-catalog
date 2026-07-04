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
    await expect(page).toHaveTitle(
      /^Browse Daylily Catalogs(?: \| Daylily Catalog){0,2}$/,
    );

    // Open the seeded public catalog. The preview smoke data is intentionally
    // stable here, while catalog ordering can change as real catalogs publish.
    const seededCatalogLink = page
      .locator('a[href="/seeded-daylily"]')
      .filter({ hasText: "Seeded Daylily Farm" });
    await expect(seededCatalogLink).toBeVisible();
    await seededCatalogLink.click();
    await expect(page).toHaveURL(/\/seeded-daylily$/);

    // Open first listing card (opens dialog)
    const firstListingCard = page
      .locator("#listings")
      .locator("div.group.relative")
      .first();
    await expect(firstListingCard).toBeVisible();
    await firstListingCard.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Navigate to cultivar page from a linked listing card
    await page.getByRole("button", { name: "Close" }).click();
    const listingPageLink = page
      .locator("#listings")
      .getByRole("link", { name: "View linked cultivar page" })
      .first();
    await expect(listingPageLink).toBeVisible();
    await listingPageLink.click();

    // Cultivar page should render a main heading
    await page.waitForURL(/\/cultivar\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
