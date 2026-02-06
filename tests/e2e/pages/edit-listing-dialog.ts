import type { Locator, Page } from "@playwright/test";

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

  constructor(page: Page) {
    this.page = page;
    // The edit listing dialog
    this.dialog = page.getByRole("dialog").filter({
      hasText: "Edit Listing",
    });
    // The list select button (opens a dialog)
    this.listSelectButton = this.dialog.locator("#list-select");
    // Form fields
    this.titleInput = this.dialog.getByLabel("Name");
    this.descriptionInput = this.dialog.getByLabel("Description");
    this.priceInput = this.dialog.getByLabel("Price");
    this.privateNoteInput = this.dialog.getByLabel("Private Notes");
    this.statusSelect = this.dialog.getByLabel("Status");
    // Sync name button (only visible when title doesn't match AHS listing name)
    this.syncNameButton = this.dialog.getByRole("button", {
      name: "Sync Name",
    });
  }

  private waitForTrpcMutation(path: string) {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/trpc/${path}`) &&
        response.request().method() === "POST",
      { timeout: 10000 },
    );
  }

  private async waitForMutationOrNoop(
    mutationPromise: Promise<unknown>,
  ): Promise<void> {
    try {
      await mutationPromise;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      if (message.includes("page.waitForResponse: Timeout")) {
        return;
      }
      throw error;
    }
  }

  private waitForListingUpdateMutation() {
    return this.waitForTrpcMutation("listing.update");
  }

  private waitForUpdateListsMutation() {
    return this.waitForTrpcMutation("listing.updateLists");
  }

  private waitForCreateListMutation() {
    return this.waitForTrpcMutation("listing.createList");
  }

  private async fillAndBlurWithOptionalSave(field: Locator, text: string) {
    const saveResponse = this.waitForListingUpdateMutation();
    await field.fill(text);
    await field.blur();
    await this.waitForMutationOrNoop(saveResponse);
  }

  async isReady() {
    await this.dialog.waitFor({ state: "visible", timeout: 10000 });
    await this.listSelectButton.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Gets the listing ID from the URL query parameter
   */
  async getListingIdFromUrl(): Promise<string | null> {
    const url = this.page.url();
    const urlObj = new URL(url);
    return urlObj.searchParams.get("editing");
  }

  /**
   * Creates a new list by typing the name and clicking create
   */
  async createList(listName: string) {
    // Click the list select button to open the dialog
    await this.listSelectButton.click();

    // Wait for the list select dialog to open
    const listDialog = this.page
      .getByRole("dialog")
      .filter({ hasText: "Select Lists" });
    await listDialog.waitFor({ state: "visible", timeout: 10000 });

    // Find the search input
    const searchInput = listDialog.getByPlaceholder("Search lists...");
    await searchInput.waitFor({ state: "visible", timeout: 5000 });

    // Type the list name
    await searchInput.fill(listName);

    // Wait for the "Create" option to appear
    const createOption = listDialog.getByRole("option", {
      name: `Create "${listName}"`,
    });
    await createOption.waitFor({ state: "visible", timeout: 5000 });

    const createListResponse = this.waitForCreateListMutation();
    const updateListsResponse = this.waitForUpdateListsMutation();

    // Click the create option
    await createOption.click();
    await createListResponse;
    await updateListsResponse;

    // Wait for the dialog to close and the list to be added
    await listDialog.waitFor({ state: "hidden", timeout: 5000 });
  }

  selectedListChip(listName: string): Locator {
    return this.listSelectButton.getByText(listName);
  }

  /**
   * Gets the current title value
   */
  async getTitle(): Promise<string> {
    return (await this.titleInput.inputValue()) ?? "";
  }

  /**
   * Fills the description field
   */
  async fillDescription(text: string) {
    await this.fillAndBlurWithOptionalSave(this.descriptionInput, text);
  }

  /**
   * Fills the price field
   */
  async fillPrice(price: number) {
    await this.fillAndBlurWithOptionalSave(this.priceInput, price.toString());
  }

  /**
   * Fills the private note field
   */
  async fillPrivateNote(text: string) {
    await this.fillAndBlurWithOptionalSave(this.privateNoteInput, text);
  }

  /**
   * Sets the status to hidden
   */
  async setStatusToHidden() {
    await this.statusSelect.click();

    const hiddenOption = this.page.getByRole("option", { name: "Hidden" });
    await hiddenOption.waitFor({ state: "visible", timeout: 5000 });

    const saveResponse = this.waitForListingUpdateMutation();
    await hiddenOption.click();
    await this.waitForMutationOrNoop(saveResponse);
  }

  /**
   * Clicks the sync name button to sync title with AHS listing name
   */
  async syncName() {
    const saveResponse = this.waitForListingUpdateMutation();
    await this.syncNameButton.click();
    await saveResponse;
  }

  /**
   * Closes the edit listing dialog
   */
  async close() {
    // Find the close button (X button) in the dialog header
    const closeButton = this.dialog
      .locator('button[aria-label="Close"]')
      .or(this.dialog.getByRole("button", { name: /close/i }).first());
    await closeButton.click();
    // Wait for dialog to close
    await this.dialog.waitFor({ state: "hidden", timeout: 5000 });
  }
}
