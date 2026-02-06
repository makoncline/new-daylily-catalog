import type { Locator, Page } from "@playwright/test";

type FilterableColumnLabel =
  | "Title"
  | "Description"
  | "Private Notes"
  | "Daylily Database Description";

export class DashboardListings {
  readonly page: Page;
  readonly heading: Locator;
  readonly createListingButton: Locator;
  readonly listingsTable: Locator;
  readonly globalSearchInput: Locator;
  readonly listsFilterButton: Locator;
  readonly pagerFirstButton: Locator;
  readonly pagerPrevButton: Locator;
  readonly pagerNextButton: Locator;
  readonly pagerLastButton: Locator;

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
    this.globalSearchInput = page.getByPlaceholder("Filter listings...");
    this.listsFilterButton = page
      .getByRole("button", { name: "Lists" })
      .first();
    this.pagerFirstButton = page.getByTestId("pager-first");
    this.pagerPrevButton = page.getByTestId("pager-prev");
    this.pagerNextButton = page.getByTestId("pager-next");
    this.pagerLastButton = page.getByTestId("pager-last");
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible", timeout: 30000 });
    await this.globalSearchInput.waitFor({ state: "visible", timeout: 30000 });
  }

  async goto() {
    await this.page.goto("/dashboard/listings");
  }

  rows(): Locator {
    return this.listingsTable.locator("tbody tr");
  }

  async visibleRowCount(): Promise<number> {
    return this.rows().count();
  }

  async firstRowTitle(): Promise<string> {
    const rowCount = await this.visibleRowCount();
    if (rowCount === 0) return "";

    const rawText = await this.rows().first().locator("td").first().innerText();
    return rawText.trim();
  }

  pageIndicator(): Locator {
    return this.page.getByTestId("pager-page-indicator");
  }

  filteredCount(): Locator {
    return this.page.getByTestId("filtered-rows-count");
  }

  listingRow(listingTitle: string): Locator {
    return this.listingsTable
      .locator("tbody tr")
      .filter({ hasText: listingTitle })
      .first();
  }

  async setGlobalSearch(value: string) {
    await this.globalSearchInput.fill(value);
  }

  async openListsFilter() {
    await this.listsFilterButton.click();
  }

  async toggleListFilterOption(label: string) {
    const option = this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: label })
      .first();
    await option.click();
  }

  async clearListsFilterInPopover() {
    await this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: "Clear filters" })
      .first()
      .click();
  }

  async openColumnFilter(columnLabel: FilterableColumnLabel) {
    const filterButton = this.page
      .getByRole("button", {
        name: `Filter ${columnLabel.toLowerCase()}`,
      })
      .first();
    await filterButton.scrollIntoViewIfNeeded();
    await filterButton.click();
  }

  async setOpenColumnFilterValue(value: string) {
    const filterInput = this.page
      .locator('input[placeholder^="Filter "]:visible')
      .last();
    await filterInput.fill(value);
  }

  async sortByColumn(columnLabel: string) {
    const sortableHeader = this.page
      .locator("th", { hasText: columnLabel })
      .first()
      .locator(":scope > div")
      .first();
    await sortableHeader.scrollIntoViewIfNeeded();
    await sortableHeader.dispatchEvent("click");
  }

  async goToNextPage() {
    await this.pagerNextButton.click();
  }

  async goToPrevPage() {
    await this.pagerPrevButton.click();
  }

  async goToFirstPage() {
    await this.pagerFirstButton.click();
  }

  async goToLastPage() {
    await this.pagerLastButton.click();
  }

  async openFirstVisibleRowActions() {
    await this.page.getByRole("button", { name: "Open menu" }).first().click();
  }

  async chooseRowActionDelete() {
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
  }

  async confirmDelete() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async resetToolbarFiltersIfVisible() {
    const resetButton = this.page.getByRole("button", { name: "Reset" }).first();
    if (await resetButton.isVisible()) {
      await resetButton.click();
    }
  }

  /**
   * Navigates back to the dashboard home page
   */
  async goToDashboard() {
    await this.page.goto("/dashboard");
  }
}
