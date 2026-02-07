import type { Locator, Page } from "@playwright/test";

const MANAGE_LIST_ACTION_TIMEOUT_MS = 10000;
const MANAGE_LIST_READY_TIMEOUT_MS = 20000;

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
    this.listingsTable = page.locator("table").first();
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
    await this.heading.waitFor({
      state: "visible",
      timeout: MANAGE_LIST_READY_TIMEOUT_MS,
    });
    await this.titleInput.waitFor({
      state: "visible",
      timeout: MANAGE_LIST_READY_TIMEOUT_MS,
    });
    await this.addListingsTrigger.waitFor({
      state: "visible",
      timeout: MANAGE_LIST_READY_TIMEOUT_MS,
    });
    await this.manageListTable.waitFor({
      state: "visible",
      timeout: MANAGE_LIST_READY_TIMEOUT_MS,
    });
    await this.globalSearchInput.waitFor({
      state: "visible",
      timeout: MANAGE_LIST_READY_TIMEOUT_MS,
    });
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
    await this.titleInput.fill(value, { timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async fillDescription(value: string) {
    await this.descriptionInput.fill(value, { timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async saveChanges() {
    await this.saveChangesButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  private waitForListUpdateMutation() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/trpc/list.update") &&
        response.request().method() === "POST",
      { timeout: 15000 },
    );
  }

  async saveChangesAndWait() {
    await Promise.all([this.waitForListUpdateMutation(), this.saveChanges()]);
  }

  async openAddListingsDialog() {
    await this.addListingsTrigger.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async searchAddListings(value: string) {
    await this.addListingsSearchInput.fill(value, {
      timeout: MANAGE_LIST_ACTION_TIMEOUT_MS,
    });
  }

  async selectListingToAdd(title: string) {
    await this.page
      .locator('[data-slot="command-item"]')
      .filter({ hasText: title })
      .first()
      .click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async setGlobalSearch(value: string) {
    await this.globalSearchInput.fill(value, {
      timeout: MANAGE_LIST_ACTION_TIMEOUT_MS,
    });
  }

  async sortByColumn(columnLabel: string) {
    const sortableButton = this.page
      .locator("th")
      .filter({ hasText: columnLabel })
      .first()
      .getByRole("button", { name: columnLabel })
      .first();
    await sortableButton.scrollIntoViewIfNeeded();
    await sortableButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async openColumnFilter(columnLabel: "Title" | "Description" | "Private Notes") {
    const filterButton = this.page
      .getByRole("button", {
        name: `Filter ${columnLabel.toLowerCase()}`,
      })
      .first();
    await filterButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async setOpenColumnFilterValue(value: string) {
    const filterInput = this.page
      .locator('input[placeholder^="Filter "]:visible')
      .last();
    await filterInput.fill(value, { timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async goToNextPage() {
    await this.pagerNextButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async goToPrevPage() {
    await this.pagerPrevButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async goToFirstPage() {
    await this.pagerFirstButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async goToLastPage() {
    await this.pagerLastButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async setRowsPerPage(value: number) {
    await this.pagerPerPage.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
    const option = this.page
      .locator('[data-slot="select-content"]:visible [data-slot="select-item"]')
      .filter({ hasText: String(value) })
      .first();
    await option.waitFor({ state: "visible", timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
    await option.scrollIntoViewIfNeeded();
    await option.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS, force: true });
  }

  async selectFirstVisibleRow() {
    await this.page
      .getByRole("checkbox", { name: "Select row" })
      .first()
      .click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  removeSelectedButton(): Locator {
    return this.page.getByRole("button", { name: /Remove \d+ selected/ });
  }

  async clickRemoveSelected() {
    await this.removeSelectedButton().click({
      timeout: MANAGE_LIST_ACTION_TIMEOUT_MS,
    });
  }

  async confirmRemoveSelected() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
  }

  async resetToolbarFiltersIfVisible() {
    const resetButton = this.page.getByRole("button", { name: "Reset" }).first();
    if (await resetButton.isVisible()) {
      await resetButton.click({ timeout: MANAGE_LIST_ACTION_TIMEOUT_MS });
    }
  }
}
