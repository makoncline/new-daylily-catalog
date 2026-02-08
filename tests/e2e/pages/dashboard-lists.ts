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
    const selectContent = this.page.locator('[data-slot="select-content"]:visible').last();
    await selectContent.waitFor({ state: "visible" });
    const option = selectContent
      .getByRole("option", { name: String(value), exact: true })
      .first();
    await option.waitFor({ state: "visible" });
    await option.scrollIntoViewIfNeeded();
    await option.click({ timeout: 5000 });
  }

  private firstVisibleRowActionButton(): Locator {
    return this.page
      .getByTestId("list-table")
      .getByTestId("list-row-actions-trigger")
      .first();
  }

  private rowActionMenuItem(actionName: "Edit" | "Delete" | "Manage"): Locator {
    const menu = this.page
      .locator('[data-slot="dropdown-menu-content"][data-state="open"]')
      .last();
    const testId =
      actionName === "Manage"
        ? "list-row-action-manage"
        : actionName === "Edit"
          ? "list-row-action-edit"
          : "list-row-action-delete";
    return menu.getByTestId(testId);
  }

  private async chooseRowAction(actionName: "Edit" | "Delete") {
    const item = this.rowActionMenuItem(actionName);
    await item.click();
  }

  async chooseRowActionEdit() {
    await this.chooseRowAction("Edit");
  }

  async chooseRowActionDelete() {
    await this.chooseRowAction("Delete");
  }

  async openFirstVisibleRowActions() {
    const actionButton = this.firstVisibleRowActionButton();
    await actionButton.waitFor({ state: "visible" });
    await actionButton.scrollIntoViewIfNeeded();
    await actionButton.click();
    await this.rowActionMenuItem("Edit").waitFor({ state: "visible" });
  }

  manageRowAction(): Locator {
    return this.rowActionMenuItem("Manage");
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
    const dialog = this.page.getByRole("alertdialog");
    await dialog.waitFor({ state: "visible" });
    const deleteButton = dialog.getByRole("button", { name: "Delete" });
    await deleteButton.waitFor({ state: "visible" });
    await deleteButton.click();
    await dialog.waitFor({ state: "hidden" });
  }

  async closeEditDialog() {
    const closeButton = this.page
      .getByRole("dialog", { name: "Edit List" })
      .getByRole("button", { name: "Close" });
    await closeButton.scrollIntoViewIfNeeded();
    await closeButton.click();
    await this.editDialog().waitFor({ state: "hidden" });
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
