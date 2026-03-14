import type { Locator, Page } from "@playwright/test";

type ListingStatus = "Published" | "Hidden";

export class EditListingDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly listSelectButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly privateNoteInput: Locator;
  readonly statusSelect: Locator;
  readonly syncNameButton: Locator;
  readonly saveChangesButton: Locator;
  readonly deleteListingButton: Locator;
  readonly unlinkAhsButton: Locator;
  readonly ahsListingSelectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog").filter({
      hasText: "Edit Listing",
    });
    this.listSelectButton = this.dialog.locator("#list-select");
    this.titleInput = this.dialog.getByLabel("Name");
    this.descriptionInput = this.dialog.getByLabel("Description");
    this.priceInput = this.dialog.getByLabel("Price");
    this.privateNoteInput = this.dialog.getByLabel("Private Notes");
    this.statusSelect = this.dialog.getByLabel("Status");
    this.syncNameButton = this.dialog.getByRole("button", {
      name: "Sync Name",
    });
    this.unlinkAhsButton = this.dialog.getByRole("button", {
      name: /Unlink/,
    });
    this.ahsListingSelectButton = this.dialog.locator("#ahs-listing-select");
    this.saveChangesButton = this.dialog.getByRole("button", {
      name: "Save Changes",
    });
    this.deleteListingButton = this.dialog.getByRole("button", {
      name: "Delete Listing",
    });
  }

  private listDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({
        has: this.page.getByRole("heading", { name: "Select Lists" }),
      })
      .first();
  }

  private ahsDialog(): Locator {
    return this.page.getByRole("dialog").filter({
      has: this.page.getByRole("heading", {
        name: "Select Daylily Database Listing",
      }),
    });
  }

  private async fillAndBlur(field: Locator, text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await field.click();
    await field.press(selectAll);
    await field.press("Backspace");
    await field.type(text);
    await field.blur();
  }

  async isReady() {
    await this.dialog.waitFor({ state: "visible" });
    await this.listSelectButton.waitFor({ state: "visible" });
  }

  async getListingIdFromUrl(): Promise<string | null> {
    const url = this.page.url();
    const urlObj = new URL(url);
    return urlObj.searchParams.get("editing");
  }

  async getEditingParamFromUrl(): Promise<string | null> {
    return this.getListingIdFromUrl();
  }

  async fillTitle(text: string) {
    await this.fillAndBlur(this.titleInput, text);
  }

  async getTitle(): Promise<string> {
    return (await this.titleInput.inputValue()) ?? "";
  }

  async fillDescription(text: string) {
    await this.fillAndBlur(this.descriptionInput, text);
  }

  async typeDescriptionWithoutBlur(text: string) {
    await this.descriptionInput.fill(text);
  }

  async fillPrice(price: number) {
    await this.fillAndBlur(this.priceInput, price.toString());
  }

  async fillPrivateNote(text: string) {
    await this.fillAndBlur(this.privateNoteInput, text);
  }

  async typePrivateNoteWithoutBlur(text: string) {
    await this.privateNoteInput.fill(text);
  }

  async setStatusTo(status: ListingStatus) {
    await this.statusSelect.click();

    const option = this.page.getByRole("option", { name: status });
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  async setStatusToHidden() {
    await this.setStatusTo("Hidden");
  }

  async setStatusToPublished() {
    await this.setStatusTo("Published");
  }

  async openListsPicker() {
    await this.listSelectButton.click();
    await this.listDialog().waitFor({ state: "visible" });
  }

  async closeListsPicker() {
    await this.page.keyboard.press("Escape");
    await this.listDialog().waitFor({ state: "hidden" });
  }

  async toggleListByName(listName: string) {
    const option = this.listDialog().getByRole("option", { name: listName });
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  async isListSelected(listName: string) {
    const option = this.listDialog().getByRole("option", { name: listName });
    await option.waitFor({ state: "visible" });

    const checkIcon = option.locator("svg").first();
    const className = (await checkIcon.getAttribute("class")) ?? "";
    return className.includes("opacity-100");
  }

  async clearAllLists() {
    const noneOption = this.listDialog().getByRole("option", { name: "None" });
    await noneOption.waitFor({ state: "visible" });
    await noneOption.click();
    await this.listDialog().waitFor({ state: "hidden" });
  }

  async createList(listName: string) {
    await this.openListsPicker();

    const searchInput = this.listDialog().getByPlaceholder("Search lists...");
    await searchInput.waitFor({ state: "visible" });
    await searchInput.fill(listName);

    const createOption = this.listDialog().getByRole("option", {
      name: `Create "${listName}"`,
    });
    await createOption.waitFor({ state: "visible" });

    await createOption.click();

    await this.listDialog().waitFor({ state: "hidden" });
  }

  selectedListChip(listName: string): Locator {
    return this.listSelectButton.getByText(listName);
  }

  async syncName() {
    await this.syncNameButton.click();
  }

  async syncAhsName() {
    await this.syncName();
  }

  linkedAhsText(listingName: string): Locator {
    return this.dialog.getByText(`Linked to ${listingName}`);
  }

  async unlinkAhs() {
    await this.unlinkAhsButton.click();
  }

  async relinkAhs(searchQuery: string, expectedListingName: string) {
    await this.ahsListingSelectButton.click();
    await this.ahsDialog().waitFor({ state: "visible" });

    const searchInput = this.ahsDialog().getByPlaceholder("Search AHS listings...");
    await searchInput.waitFor({ state: "visible" });
    await searchInput.fill(searchQuery);

    const listingOption = this.ahsDialog()
      .locator('[data-slot="command-item"]')
      .filter({ hasText: expectedListingName })
      .first();
    await listingOption.waitFor({ state: "visible" });

    await listingOption.click();
    await this.ahsDialog().waitFor({ state: "hidden" });
  }

  async clickSaveChanges() {
    await this.saveChangesButton.click();
  }

  async clickDeleteListing() {
    await this.deleteListingButton.click();
  }

  async confirmDeleteListing() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async close() {
    const closeButton = this.dialog
      .locator('button[aria-label="Close"]')
      .or(this.dialog.getByRole("button", { name: /close/i }).first());
    await closeButton.click();
    await this.dialog.waitFor({ state: "hidden" });
  }

  async closeWithHeaderX() {
    await this.close();
  }
}
