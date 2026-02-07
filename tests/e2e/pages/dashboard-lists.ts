import type { Locator, Page } from "@playwright/test";

export class DashboardLists {
  readonly page: Page;
  readonly heading: Locator;
  readonly createListButton: Locator;
  readonly listsTableReady: Locator;
  readonly listsTable: Locator;
  readonly globalSearchInput: Locator;
  readonly pagerFirstButton: Locator;
  readonly pagerPrevButton: Locator;
  readonly pagerNextButton: Locator;
  readonly pagerLastButton: Locator;
  readonly pagerPerPage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").filter({ hasText: "Lists" }).first();
    this.createListButton = page.getByRole("button", { name: "Create List" }).first();
    this.listsTableReady = page.getByTestId("list-table");
    this.listsTable = page.locator("table").first();
    this.globalSearchInput = page.getByPlaceholder("Filter lists...");
    this.pagerFirstButton = page.getByTestId("pager-first");
    this.pagerPrevButton = page.getByTestId("pager-prev");
    this.pagerNextButton = page.getByTestId("pager-next");
    this.pagerLastButton = page.getByTestId("pager-last");
    this.pagerPerPage = page.getByTestId("pager-per-page");
  }

  async goto() {
    await this.page.goto("/dashboard/lists");
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible" });
    await this.createListButton.waitFor({ state: "visible" });
    await this.listsTableReady.waitFor({ state: "visible" });
    await this.globalSearchInput.waitFor({ state: "visible" });
  }

  rows(): Locator {
    return this.listsTable.locator("tbody tr");
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

  listRow(listTitle: string): Locator {
    return this.listsTable
      .locator("tbody tr")
      .filter({ hasText: listTitle })
      .first();
  }

  async setGlobalSearch(value: string) {
    await this.globalSearchInput.scrollIntoViewIfNeeded();
    await this.globalSearchInput.click();
    await this.globalSearchInput.fill(value);
  }

  async sortByColumn(columnLabel: string) {
    const sortableButton = this.page
      .locator("th")
      .filter({ hasText: columnLabel })
      .first()
      .getByRole("button", { name: columnLabel })
      .first();
    await sortableButton.scrollIntoViewIfNeeded();
    await sortableButton.click();
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

  async setRowsPerPage(value: number) {
    await this.pagerPerPage.scrollIntoViewIfNeeded();
    await this.pagerPerPage.click();
    const option = this.page
      .locator('[data-slot="select-item"]')
      .filter({ hasText: String(value) })
      .first();
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }

  async openFirstVisibleRowActions() {
    const firstActionRow = this.page
      .getByTestId("list-table")
      .locator("table")
      .last()
      .locator("tbody tr")
      .first();
    const actionButton = firstActionRow.getByRole("button", { name: "Open menu" });
    await actionButton.scrollIntoViewIfNeeded();
    await actionButton.click();
  }

  async chooseRowActionEdit() {
    const editItem = this.page
      .locator('[data-slot="dropdown-menu-content"]:visible')
      .last()
      .getByRole("menuitem", { name: "Edit" });
    await editItem.scrollIntoViewIfNeeded();
    await editItem.click();
  }

  async chooseRowActionDelete() {
    const deleteItem = this.page
      .locator('[data-slot="dropdown-menu-content"]:visible')
      .last()
      .getByRole("menuitem", { name: "Delete" });
    await deleteItem.scrollIntoViewIfNeeded();
    await deleteItem.click();
  }

  manageRowAction(): Locator {
    return this.page
      .locator('[data-slot="dropdown-menu-content"]:visible')
      .last()
      .getByRole("menuitem", { name: "Manage" });
  }

  async manageRowActionHref(): Promise<string | null> {
    const action = this.manageRowAction();
    const nestedLink = action.locator("a").first();
    if (await nestedLink.count()) {
      return nestedLink.getAttribute("href");
    }
    return action.getAttribute("href");
  }

  async confirmDelete() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async closeEditDialog() {
    const closeButton = this.page
      .getByRole("dialog", { name: "Edit List" })
      .getByRole("button", { name: "Close" });
    await closeButton.scrollIntoViewIfNeeded();
    await closeButton.click();
  }

  editDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Edit List" });
  }

  editTitleInput(): Locator {
    return this.editDialog().getByLabel("Title");
  }

  editDescriptionInput(): Locator {
    return this.editDialog().getByLabel("Description");
  }

  saveChangesButton(): Locator {
    return this.editDialog().getByRole("button", { name: "Save Changes" });
  }

  resetButton(): Locator {
    return this.page.getByRole("button", { name: "Reset" }).first();
  }

  async resetToolbarFiltersIfVisible() {
    if (await this.resetButton().isVisible()) {
      await this.resetButton().click();
    }
  }
}
