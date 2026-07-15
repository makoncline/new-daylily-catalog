import { test, expect } from "../../e2e/test-setup";

test.describe("guest user tour @preview", () => {
  test("navigates through unauthed pages", async ({ page }) => {
    // Home page
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Daylily Catalog");

    const exampleCultivarLink = page.getByRole("link", {
      name: "See an example cultivar page",
    });
    await expect(exampleCultivarLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/cultivar\/[^/]+$/),
      exampleCultivarLink.click(),
    ]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

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

    // Open first listing card (opens dialog)
    const firstListingCard = page
      .locator("#listings")
      .locator("div.group.relative")
      .first();
    await expect(firstListingCard).toBeVisible();
    await firstListingCard.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
