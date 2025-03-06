import { test, expect } from "@playwright/test";

test.describe("Table State Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    // Add response logging
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/trpc/public.getListings")) {
        try {
          const data = await response.json();
          console.log("API Response:", {
            url,
            status: response.status(),
            data,
          });
        } catch (error) {
          console.error("Failed to parse response:", error);
        }
      }
    });
  });

  test("catalogs page should persist table state in URL", async ({ page }) => {
    console.log("Starting catalogs page test");
    await page.goto("/catalogs");

    // Wait for catalogs table or empty state to be visible
    const catalogsTable = page.getByTestId("catalogs-table");
    const emptyState = page.getByText("No Catalogs Found");
    await expect(catalogsTable.or(emptyState)).toBeVisible();
    console.log("Table or empty state is visible");

    // Skip test if no catalogs
    if (!(await catalogsTable.isVisible())) {
      console.log("No catalogs found, skipping test");
      test.skip();
    }
    console.log("Catalogs table is visible");

    // Fill search input
    const searchInput = page.getByPlaceholder("Search catalogs...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    console.log("Filled search input with 'test'");

    // Wait for network requests to complete
    await page.waitForLoadState("networkidle");
    console.log("Network requests completed");

    // Verify URL has search parameter
    await expect(page).toHaveURL(/.*[?&]query=test/);
    console.log("URL has search parameter:", page.url());

    // Test page size
    const pageSizeSelect = page.getByRole("combobox", {
      name: "Rows per page",
    });
    await expect(pageSizeSelect).toBeVisible();
    await pageSizeSelect.click();
    await page.getByRole("option", { name: "24" }).click();
    await expect(page).toHaveURL(/.*[?&]size=24/);
    console.log("Changed page size to 24, URL:", page.url());

    // Store current URL for later comparison
    const currentUrl = page.url();
    console.log("Current URL before reload:", currentUrl);

    // Reload page
    console.log("Reloading page...");
    await page.reload();
    await page.waitForLoadState("networkidle");
    console.log("Page reloaded, current URL:", page.url());

    // Wait for table to be visible again
    await expect(catalogsTable).toBeVisible();
    console.log("Table is visible after reload");

    // Verify URL parameters are preserved
    await expect(page).toHaveURL(currentUrl);
    console.log("URL parameters preserved after reload");

    // Wait for search input to be ready and verify its value
    await searchInput.waitFor({ state: "attached" });
    const searchValue = await searchInput.inputValue();
    console.log("Search input value after reload:", searchValue);
    await expect(searchInput).toHaveValue("test", { timeout: 10000 });

    // Verify page size is preserved
    const pageSizeSelectAfterReload = page.getByRole("combobox", {
      name: "Rows per page",
    });
    await expect(pageSizeSelectAfterReload).toBeVisible();
    await expect(pageSizeSelectAfterReload).toHaveText("24");

    // Test pagination if available
    const nextPageButton = page.getByRole("button", { name: "Next" });
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await expect(page).toHaveURL(/.*[?&]page=2/);
      console.log("Clicked next page, URL:", page.url());
    } else {
      console.log("Next page button is disabled");
    }
  });

  test("catalog listings page should persist table state in URL", async ({
    page,
  }) => {
    console.log("Starting catalog listings page test");
    await page.goto("/test-garden");

    // Wait for listings section to be visible
    const listingsSection = page.getByTestId("listings-section");
    await expect(listingsSection).toBeVisible();
    console.log("Listings section is visible");

    // Check for no results state
    const noResults = page.getByText("No listings found");
    const hasNoResults = await noResults.isVisible();
    if (hasNoResults) {
      console.log("No listings found before search");
    }

    // Fill search input
    const searchInput = page.getByPlaceholder("Search listings...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    console.log("Filled search input with 'test'");

    // Wait for network requests to complete
    await page.waitForLoadState("networkidle");
    console.log("Network requests completed");

    // Check for no results after search
    if (await noResults.isVisible()) {
      console.log("No listings found after search with 'test'");
    }

    // Test page size
    const pageSizeSelect = page.getByRole("combobox", {
      name: "Rows per page",
    });
    await expect(pageSizeSelect).toBeVisible();
    await pageSizeSelect.click();
    await page.getByRole("option", { name: "24" }).click();
    console.log("Changed page size to 24");

    // Verify URL has search parameter
    await expect(page).toHaveURL(/.*[?&]query=test/);
    console.log("URL has search parameter:", page.url());

    // Test list filter if available
    const listsSection = page.getByTestId("lists-section");
    if (await listsSection.isVisible()) {
      const firstList = listsSection.locator(".group").first();
      await firstList.click();
      await expect(page).toHaveURL(/.*[?&]lists=/);
      console.log("Clicked first list, URL:", page.url());

      // Verify URL still has search parameter
      await expect(page).toHaveURL(/.*[?&]query=test/);
      console.log("URL still has search parameter after list selection");
    } else {
      console.log("Lists section is not visible");
    }

    // Store current URL for later comparison
    const currentUrl = page.url();
    console.log("Current URL before reload:", currentUrl);

    // Reload page
    console.log("Reloading page...");
    await page.reload();
    await page.waitForLoadState("networkidle");
    console.log("Page reloaded, current URL:", page.url());

    // Wait for listings section to be visible again
    await expect(listingsSection).toBeVisible();
    console.log("Listings section is visible after reload");

    // Check for no results after reload
    if (await noResults.isVisible()) {
      console.log("No listings found after reload");
      test.fail(true, "No listings found after reload - check test data");
    }

    // Wait for data to be loaded by checking for a listing card
    const listingCard = listingsSection.getByTestId("listing-card");
    await expect(listingCard).toBeVisible({ timeout: 10000 });
    console.log("First listing card is visible");

    // Verify URL parameters are preserved
    await expect(page).toHaveURL(currentUrl);
    console.log("URL parameters preserved after reload");

    // Wait for search input to be ready and verify its value
    const searchInputLocator = page.locator(
      'input[placeholder="Search listings..."]',
    );
    await expect(searchInputLocator).toBeVisible();
    await expect(searchInputLocator).toBeEnabled();
    try {
      await expect(searchInputLocator).toHaveValue("test", { timeout: 10000 });
      console.log("Search input value verified after reload");
    } catch (error) {
      console.log(
        "Search input value check failed, waiting 1s and debugging...",
      );
      await page.waitForTimeout(1000);
      const html = await page.content();
      console.log("Page HTML:", html);
      throw error;
    }

    // Verify page size is preserved
    const pageSizeSelectAfterReload = page.getByRole("combobox", {
      name: "Rows per page",
    });
    await expect(pageSizeSelectAfterReload).toBeVisible();
    await expect(pageSizeSelectAfterReload).toHaveText("24");

    // Test pagination if available
    const nextPageButton = page.getByRole("button", { name: "Next" });
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await expect(page).toHaveURL(/.*[?&]page=2/);
      console.log("Clicked next page, URL:", page.url());
    } else {
      console.log("Next page button is disabled");
    }
  });
});
