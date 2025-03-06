import { test, expect } from "@playwright/test";

test.describe("Table State Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  });

  test("catalogs page should persist table state in URL", async ({ page }) => {
    // Start from catalogs page
    await page.goto("/catalogs");

    // Wait for catalogs table or empty state to be visible
    const catalogsTable = page.getByTestId("catalogs-table");
    const emptyState = page.getByText("No Catalogs Found");
    await expect(catalogsTable.or(emptyState)).toBeVisible();

    // Only test if we have catalogs
    if (await catalogsTable.isVisible()) {
      // Test global filter
      const searchInput = page.getByPlaceholder("Search catalogs...");
      await searchInput.fill("test");
      await searchInput.press("Enter");
      await expect(page).toHaveURL(/.*[?&]query=test/);

      // Test page size
      const pageSizeSelect = page.getByRole("combobox");
      await pageSizeSelect.click();
      await page.getByRole("option", { name: "24" }).waitFor();
      await page.getByRole("option", { name: "24" }).click();
      await expect(page).toHaveURL(/.*[?&]size=24/);

      // Verify state persists after reload
      await page.reload();
      await expect(searchInput).toHaveValue("test");
      await expect(page.getByText("24")).toBeVisible();

      // Test pagination
      const nextPageButton = page.getByRole("button", { name: "Next" });
      if (await nextPageButton.isEnabled()) {
        await nextPageButton.click();
        await expect(page).toHaveURL(/.*[?&]page=2/);
      }
    }
  });

  test("catalog listings page should persist table state in URL", async ({
    page,
  }) => {
    // Start from catalogs page
    await page.goto("/catalogs");

    // Wait for catalogs table or empty state to be visible
    const catalogsTable = page.getByTestId("catalogs-table");
    const emptyState = page.getByText("No Catalogs Found");
    await expect(catalogsTable.or(emptyState)).toBeVisible();

    // Only test if we have catalogs
    if (await catalogsTable.isVisible()) {
      // Click first catalog
      const firstCatalog = page.getByTestId("catalog-card");
      await firstCatalog.click();

      // Wait for listings section
      await expect(page.getByTestId("listings-section")).toBeVisible();

      // Test global filter
      const searchInput = page.getByPlaceholder("Search listings...");
      await searchInput.fill("test");
      await searchInput.press("Enter");
      await expect(page).toHaveURL(/.*[?&]query=test/);

      // Test list filter if we have lists
      const listsSection = page.getByTestId("lists-section");
      if (await listsSection.isVisible()) {
        const firstList = listsSection.locator(".group").first();
        await firstList.click();
        await expect(page).toHaveURL(/.*[?&]lists=/);
      }

      // Test page size
      const pageSizeSelect = page.getByRole("combobox");
      await pageSizeSelect.click();
      await page.getByRole("option", { name: "24" }).waitFor();
      await page.getByRole("option", { name: "24" }).click();
      await expect(page).toHaveURL(/.*[?&]size=24/);

      // Verify state persists after reload
      await page.reload();
      await expect(searchInput).toHaveValue("test");
      await expect(page.getByText("24")).toBeVisible();

      // Test pagination
      const nextPageButton = page.getByRole("button", { name: "Next" });
      if (await nextPageButton.isEnabled()) {
        await nextPageButton.click();
        await expect(page).toHaveURL(/.*[?&]page=2/);
      }
    }
  });
});
