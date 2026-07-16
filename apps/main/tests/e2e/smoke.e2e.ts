import { test, expect } from "../../e2e/test-setup";

test.describe("guest user tour @preview", () => {
  test("navigates through unauthed pages", async ({ page }) => {
    test.slow();

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

    // Open one of the stage-login catalogs retained from realistic data.
    const realisticCatalogLink = page
      .locator('a[href="/plantfancygardens"]')
      .filter({ hasText: "PlantFancyGardens" });
    await expect(realisticCatalogLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/plantfancygardens$/, { timeout: 60_000 }),
      realisticCatalogLink.click(),
    ]);

    // Open the first listing by clicking its visible title.
    const firstListingCard = page
      .locator("#listings")
      .locator("div.group.relative")
      .first();
    await expect(firstListingCard).toBeVisible();
    await firstListingCard.getByRole("heading").click();
    const listingDialog = page.getByRole("dialog");
    await expect(listingDialog).toBeVisible({ timeout: 30_000 });

    // Follow the visible cultivar link from the listing dialog.
    const cultivarPagePromise = page.waitForEvent("popup");
    await listingDialog
      .getByRole("link", { name: "Open cultivar page" })
      .click();
    const cultivarPage = await cultivarPagePromise;

    // Cultivar page should render a main heading
    await cultivarPage.waitForURL(/\/cultivar\/[^/]+$/, { timeout: 60_000 });
    await expect(cultivarPage.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
