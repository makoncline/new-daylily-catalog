import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  });

  test("should navigate through public catalog pages", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");
    await page.screenshot({ path: "screenshots/home.png" });
    console.log("Navigated to home page");

    // Click on Catalogs link in nav
    const catalogsLink = page.getByRole("link", { name: "Catalogs" });
    await expect(catalogsLink).toBeVisible();
    await catalogsLink.click();
    await page.screenshot({ path: "screenshots/catalogs.png" });
    console.log("Clicked catalogs link");

    // Wait for navigation
    await page.waitForURL("/catalogs");
    console.log("URL changed to /catalogs");

    // Wait for catalogs table or empty state to be visible
    const catalogsTable = page.getByTestId("catalogs-table");
    const emptyState = page.getByText("No Catalogs Found");

    await expect(catalogsTable.or(emptyState)).toBeVisible({
      timeout: 15000,
    });
    console.log("Catalogs table or empty state visible");

    // If we have catalogs, try to click the first one
    if (await catalogsTable.isVisible()) {
      const firstCatalog = page.getByTestId("catalog-card");
      await firstCatalog.click();
      await page.screenshot({ path: "screenshots/catalog-detail.png" });
      console.log("Clicked first catalog");

      // Wait for listing card
      await expect(page.getByTestId("listing-card")).toBeVisible({
        timeout: 15000,
      });
      console.log("Listing card visible");

      // Wait for profile section
      await expect(page.getByTestId("profile")).toBeVisible({
        timeout: 15000,
      });
      console.log("Profile section visible");

      // Verify catalog page content
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Check for description if it exists
      const description = page.getByTestId("catalog-description");
      if (await description.isVisible()) {
        await expect(description).toBeVisible();
      }

      // Click first listing if it exists
      const firstListing = page.getByTestId("listing-card").first();
      if (await firstListing.isVisible()) {
        await firstListing.click();
        await page.screenshot({ path: "screenshots/listing-detail.png" });
        console.log("Clicked first listing");

        // Wait for listing dialog
        await expect(page.getByTestId("listing-display")).toBeVisible({
          timeout: 15000,
        });
        console.log("Listing dialog visible");

        // Verify listing page content
        await expect(page.getByTestId("listing-display")).toBeVisible();
        await expect(page.getByTestId("listing-details")).toBeVisible();
      } else {
        console.log("No listings found in catalog");
      }
    } else {
      console.log("No catalogs found");
    }
  });

  test("should handle search and filtering", async ({ page }) => {
    await page.goto("/catalogs");

    // Wait for search input
    const searchInput = page.getByPlaceholder("Search catalogs...");
    await expect(searchInput).toBeVisible();

    // Wait for catalogs table or empty state to be visible
    const catalogsTable = page.getByTestId("catalogs-table");
    const emptyState = page.getByText("No Catalogs Found");

    await expect(catalogsTable.or(emptyState)).toBeVisible();

    // Only test search if we have catalogs
    if (await catalogsTable.isVisible()) {
      // Test search
      await searchInput.fill("test");
      await searchInput.press("Enter");

      // Wait for either search results or no results message
      const noResults = page.getByText("No Catalogs Found");
      await expect(catalogsTable.or(noResults)).toBeVisible();

      // Test filters if they exist
      const filterButton = page.getByRole("button", { name: "Filter" });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        // Add filter interactions here
      }
    }
  });

  test("should handle non-existent pages gracefully", async ({ page }) => {
    // Test non-existent catalog
    await page.goto("/non-existent");
    await page.screenshot({ path: "screenshots/not-found-catalog.png" });

    // Wait for error boundary to render
    await page.waitForLoadState("networkidle");
    console.log("Page loaded");

    // Wait for and verify error message
    await expect(page.getByTestId("error-state")).toBeVisible({
      timeout: 10000,
    });
    console.log("Error state visible");

    // Verify the correct action button is present
    await expect(
      page.getByRole("link", { name: "Browse Catalogs" }),
    ).toBeVisible();

    // Test non-existent listing (should show catalog not found since user doesn't exist)
    await page.goto("/non-existent/non-existent");
    await page.screenshot({ path: "screenshots/not-found-listing.png" });

    // Wait for error boundary to render
    await page.waitForLoadState("networkidle");
    console.log("Page loaded");

    // Wait for and verify error message
    await expect(page.getByTestId("error-state")).toBeVisible({
      timeout: 10000,
    });
    console.log("Error state visible");

    // Verify the correct action button is present (should be Browse Catalogs since user doesn't exist)
    await expect(
      page.getByRole("link", { name: "Browse Catalogs" }),
    ).toBeVisible();
  });
});
