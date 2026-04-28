import type { Locator, Page } from "@playwright/test";

export class ManageListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveChangesButton: Locator;
  readonly deleteListButton: Locator;
  readonly addListingsTrigger: Locator;
  readonly addListingsSearchInput: Locator;
  readonly manageListTable: Locator;
  readonly listingsTable: Locator;
  readonly globalSearchInput: Locator;
  readonly pagerFirstButton: Locator;
  readonly pagerPrevButton: Locator;
  readonly pagerNextButton: Locator;
  readonly pagerLastButton: Locator;
  readonly pagerPerPage: Locator;
  private openColumnFilterLabel: "Title" | "Description" | "Private Notes" | null =
    null;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /^Manage List:/ }).first();
    this.titleInput = page.getByLabel("Title");
    this.descriptionInput = page.getByLabel("Description");
    this.saveChangesButton = page.getByRole("button", { name: "Save Changes" });
    this.deleteListButton = page.getByRole("button", { name: "Delete List" });
    this.addListingsTrigger = page.getByTestId("add-listings-trigger");
    this.addListingsSearchInput = page.getByTestId("add-listings-search-input");
    this.manageListTable = page.getByTestId("manage-list-table");
    this.listingsTable = this.manageListTable.locator("table").first();
    this.globalSearchInput = page.getByPlaceholder("Filter listings...");
    this.pagerFirstButton = page.getByTestId("pager-first");
    this.pagerPrevButton = page.getByTestId("pager-prev");
    this.pagerNextButton = page.getByTestId("pager-next");
    this.pagerLastButton = page.getByTestId("pager-last");
    this.pagerPerPage = page.getByTestId("pager-per-page");
  }

  async goto(listId: string) {
    await this.page.goto(`/dashboard/lists/${listId}`);
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible" });
    await this.titleInput.waitFor({ state: "visible" });
    await this.addListingsTrigger.waitFor({ state: "visible" });
    await this.manageListTable.waitFor({ state: "visible" });
    await this.globalSearchInput.waitFor({ state: "visible" });
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

    const rawText = await this.rows().first().locator("td").nth(1).innerText();
    return rawText.trim();
  }

  pageIndicator(): Locator {
    return this.page.getByTestId("pager-page-indicator");
  }

  filteredCount(): Locator {
    return this.page.getByTestId("filtered-rows-count");
  }

  listingRow(title: string): Locator {
    return this.rows().filter({ hasText: title }).first();
  }

  async fillTitle(value: string) {
    await this.titleInput.fill(value);
  }

  async fillDescription(value: string) {
    await this.descriptionInput.fill(value);
  }

  private async clickWithScroll(locator: Locator) {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click();
  }

  async saveChanges() {
    await this.clickWithScroll(this.saveChangesButton);
  }

  async saveChangesAndWait() {
    await this.saveChanges();
  }

  async openAddListingsDialog() {
    await this.clickWithScroll(this.addListingsTrigger);
  }

  async searchAddListings(value: string) {
    await this.addListingsSearchInput.fill(value);
  }

  async selectListingToAdd(title: string) {
    const option = this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: title })
      .first();
    await this.clickWithScroll(option);
  }

  async setGlobalSearch(value: string) {
    await this.globalSearchInput.fill(value);
  }

  async sortByColumn(columnLabel: string) {
    const sortableButton = this.page
      .locator("th")
      .filter({ hasText: columnLabel })
      .first()
      .getByRole("button", { name: columnLabel })
      .first();
    await this.clickWithScroll(sortableButton);
  }

  async openColumnFilter(columnLabel: "Title" | "Description" | "Private Notes") {
    this.openColumnFilterLabel = columnLabel;
    const filterButton = this.manageListTable
      .getByRole("button", {
        name: `Filter ${columnLabel.toLowerCase()}`,
      })
      .first();
    await this.clickWithScroll(filterButton);
  }

  async setOpenColumnFilterValue(value: string) {
    const columnLabel = this.openColumnFilterLabel ?? "Title";
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const filterInput = this.page
          .getByPlaceholder(`Filter ${columnLabel.toLowerCase()}...`)
          .first();
        await filterInput.waitFor({ state: "visible", timeout: 5000 });
        await filterInput.fill(value, { timeout: 5000 });
        return;
      } catch (error) {
        lastError = error;
        // Popover content can detach during table rerenders; reopen and retry.
        await this.page.keyboard.press("Escape").catch(() => undefined);
        await this.openColumnFilter(columnLabel);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `Failed to set column filter "${columnLabel}" after 3 attempts: ${message}`,
    );
  }

  async goToNextPage() {
    await this.clickWithScroll(this.pagerNextButton);
  }

  async goToPrevPage() {
    await this.clickWithScroll(this.pagerPrevButton);
  }

  async goToFirstPage() {
    await this.clickWithScroll(this.pagerFirstButton);
  }

  async goToLastPage() {
    await this.clickWithScroll(this.pagerLastButton);
  }

  async setRowsPerPage(value: number) {
    await this.clickWithScroll(this.pagerPerPage);
    const selectContent = this.page.locator('[data-slot="select-content"]:visible').last();
    await selectContent.waitFor({ state: "visible" });
    const option = selectContent
      .getByRole("option", { name: String(value), exact: true })
      .first();
    await this.clickWithScroll(option);
  }

  async selectFirstVisibleRow() {
    const checkbox = this.rows()
      .first()
      .getByRole("checkbox", { name: "Select row" })
      .first();
    await this.clickWithScroll(checkbox);
  }

  removeSelectedButton(): Locator {
    return this.page.getByRole("button", { name: /Remove \d+ selected/ });
  }

  async clickRemoveSelected() {
    await this.clickWithScroll(this.removeSelectedButton());
  }

  async confirmRemoveSelected() {
    const deleteButton = this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .first();
    await this.clickWithScroll(deleteButton);
  }

  async resetToolbarFiltersIfVisible() {
    const resetButton = this.page.getByRole("button", { name: "Reset" }).first();
    if (await resetButton.isVisible()) {
      await this.clickWithScroll(resetButton);
    }
  }
}
