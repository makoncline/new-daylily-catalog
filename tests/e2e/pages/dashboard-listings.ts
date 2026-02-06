import type { Locator, Page } from "@playwright/test";

export class DashboardListings {
  readonly page: Page;
  readonly heading: Locator;
  readonly createListingButton: Locator;
  readonly listingsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use h1 selector to target the page header specifically, avoiding the "No listings" h3
    // Use .first() since there might be multiple h1 elements with "Listings" text
    this.heading = page.locator("h1").filter({ hasText: "Listings" }).first();
    // Use .first() to get the button in the page header (rendered first)
    // EmptyState components also have CreateListingButton, but they render after the page header
    this.createListingButton = page
      .getByTestId("create-listing-button")
      .first();
    // The left-pinned table contains title rows.
    this.listingsTable = page.locator("table").first();
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible", timeout: 30000 });
  }

  async goto() {
    await this.page.goto("/dashboard/listings");
  }

  listingRow(listingTitle: string): Locator {
    return this.listingsTable
      .locator("tbody tr")
      .filter({ hasText: listingTitle })
      .first();
  }

  /**
   * Navigates back to the dashboard home page
   */
  async goToDashboard() {
    await this.page.goto("/dashboard");
  }
}
