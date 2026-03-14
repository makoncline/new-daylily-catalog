import { expect, type Locator, type Page } from "@playwright/test";

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
  readonly listingTableReady: Locator;
  readonly listsFilterButton: Locator;
  readonly pagerFirstButton: Locator;
  readonly pagerPrevButton: Locator;
  readonly pagerNextButton: Locator;
  readonly pagerLastButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").filter({ hasText: "Listings" }).first();
    this.createListingButton = page
      .getByTestId("create-listing-button")
      .first();
    this.listingsTable = page.locator("table").first();
    this.listingTableReady = page.getByTestId("listing-table");
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
    await this.heading.waitFor({ state: "visible" });
    await this.createListingButton.waitFor({ state: "visible" });
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

  rowActionTrigger(listingTitle: string): Locator {
    return this.listingRow(listingTitle)
      .locator('[data-testid="listing-row-actions-trigger"]')
      .first();
  }

  async setGlobalSearch(value: string) {
    await this.globalSearchInput.waitFor({ state: "visible" });
    await this.globalSearchInput.scrollIntoViewIfNeeded();
    await this.globalSearchInput.fill(value);
  }

  async openListsFilter() {
    await this.listsFilterButton.scrollIntoViewIfNeeded();
    await this.listsFilterButton.click();
  }

  async toggleListFilterOption(label: string) {
    const option = this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: label })
      .first();
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }

  async clearListsFilterInPopover() {
    const clearFilters = this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: "Clear filters" })
      .first();
    await clearFilters.scrollIntoViewIfNeeded();
    await clearFilters.click();
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
    await this.pagerNextButton.scrollIntoViewIfNeeded();
    await this.pagerNextButton.click();
  }

  async goToPrevPage() {
    await this.pagerPrevButton.scrollIntoViewIfNeeded();
    await this.pagerPrevButton.click();
  }

  async goToFirstPage() {
    await this.pagerFirstButton.scrollIntoViewIfNeeded();
    await this.pagerFirstButton.click();
  }

  async goToLastPage() {
    await this.pagerLastButton.scrollIntoViewIfNeeded();
    await this.pagerLastButton.click();
  }

  private firstVisibleRowActionButton(): Locator {
    return this.page
      .getByTestId("listing-table")
      .locator('[data-testid="listing-row-actions-trigger"]:visible')
      .first();
  }

  private rowActionMenu(): Locator {
    return this.page
      .locator('[data-slot="dropdown-menu-content"][data-state="open"]')
      .last();
  }

  private rowActionMenuItem(actionName: "Delete" | "Edit"): Locator {
    const testId =
      actionName === "Edit" ? "listing-row-action-edit" : "listing-row-action-delete";
    return this.page.locator(`[data-testid="${testId}"]:visible`).first();
  }

  private async clickRowActionTriggerAndWaitOpen(
    rowActionButtonFactory?: () => Locator,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const trigger =
          rowActionButtonFactory?.() ?? this.firstVisibleRowActionButton();
        await trigger.waitFor({ state: "visible" });
        await trigger.click({ force: true });
        await this.rowActionMenu().waitFor({ state: "visible", timeout: 2000 });
        return;
      } catch {}
    }

    await expect(this.rowActionMenu()).toBeVisible();
  }

  private async ensureRowActionMenuOpen(rowActionButtonFactory?: () => Locator) {
    if (await this.rowActionMenu().isVisible()) {
      return;
    }

    await this.clickRowActionTriggerAndWaitOpen(rowActionButtonFactory);
  }

  async openFirstVisibleRowActions() {
    await this.clickRowActionTriggerAndWaitOpen();
    await this.rowActionMenuItem("Edit").waitFor({ state: "visible" });
  }

  async openFirstVisibleRowEdit() {
    await this.clickRowActionTriggerAndWaitOpen();
    const menuItem = this.rowActionMenuItem("Edit");
    await menuItem.waitFor({ state: "visible" });
    await menuItem.click();
  }

  async openRowActionsForListing(listingTitle: string) {
    await this.clickRowActionTriggerAndWaitOpen(() =>
      this.rowActionTrigger(listingTitle),
    );
    await this.rowActionMenuItem("Edit").waitFor({ state: "visible" });
  }

  private async chooseRowAction(
    actionName: "Delete" | "Edit",
    rowActionButtonFactory?: () => Locator,
  ) {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.ensureRowActionMenuOpen(rowActionButtonFactory);
        const menuItem = this.rowActionMenuItem(actionName);
        await menuItem.waitFor({ state: "visible" });
        await menuItem.scrollIntoViewIfNeeded();
        await menuItem.click();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to choose row action "${actionName}"`);
  }

  async chooseRowActionDelete() {
    await this.chooseRowAction("Delete");
  }

  async chooseRowActionDeleteForListing(listingTitle: string) {
    await this.chooseRowAction("Delete", () => this.rowActionTrigger(listingTitle));
  }

  async chooseRowActionEdit() {
    await this.chooseRowAction("Edit");
  }

  async chooseRowActionEditForListing(listingTitle: string) {
    await this.chooseRowAction("Edit", () => this.rowActionTrigger(listingTitle));
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

  statusCell(status: string): Locator {
    return this.page.locator("td").filter({ hasText: status }).first();
  }

  async goToDashboard() {
    await this.page.goto("/dashboard");
  }
}
