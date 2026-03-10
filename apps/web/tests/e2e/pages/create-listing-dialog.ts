import type { Locator, Page } from "@playwright/test";

export class CreateListingDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly ahsDialog: Locator;
  readonly ahsListingSelectButton: Locator;
  readonly titleInput: Locator;
  readonly syncWithAhsButton: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The dialog should be visible after clicking Create Listing button
    this.dialog = page.getByRole("dialog").filter({
      hasText: "Create New Listing",
    });
    this.ahsDialog = page.getByRole("dialog").filter({
      has: page.getByRole("heading", {
        name: "Select Daylily Database Listing",
      }),
    });
    // The AHS listing select button (opens another dialog)
    // Note: This button has role="combobox" not role="button"
    // Use the id attribute for more reliable selection
    this.ahsListingSelectButton = this.dialog.locator("#ahs-listing-select");
    // The title input field
    this.titleInput = this.dialog.getByLabel("Listing Title");
    this.syncWithAhsButton = this.dialog.getByRole("button", {
      name: "Sync with AHS name",
    });
    // The create button in the footer
    this.createButton = this.dialog
      .getByRole("button", { name: "Create Listing" })
      .last(); // Use last() to avoid matching buttons in nested dialogs
    // The cancel button
    this.cancelButton = this.dialog.getByRole("button", { name: "Cancel" });
  }

  async isReady() {
    await this.dialog.waitFor({ state: "visible" });
    await this.ahsListingSelectButton.waitFor({ state: "visible" });
  }

  async isCreateEnabled(): Promise<boolean> {
    return this.createButton.isEnabled();
  }

  async openAhsPicker() {
    await this.ahsListingSelectButton.click();
    await this.ahsDialog.waitFor({ state: "visible" });
  }

  /**
   * Opens the AHS listing select dialog and searches for a listing
   * @param searchQuery - Partial text to search for (e.g., "Stella")
   * @param expectedListingName - Full name of the listing to select (e.g., "Stella de Oro")
   */
  async searchAndSelectAhsListing(
    searchQuery: string,
    expectedListingName: string,
  ) {
    await this.openAhsPicker();

    // Find the search input in the AHS dialog
    const searchInput = this.ahsDialog.getByPlaceholder("Search AHS listings...");
    await searchInput.waitFor({ state: "visible" });

    // Type the search query (partial name)
    await searchInput.fill(searchQuery);

    // Wait for results to appear (the CommandItem with the listing name)
    // CommandItem might be rendered as a button or div, so we use text content
    const listingOption = this.ahsDialog
      .locator('[data-slot="command-item"]')
      .filter({ hasText: expectedListingName });
    await listingOption.waitFor({ state: "visible" });

    // Click the listing option to select it
    await listingOption.click();
    await this.ahsDialog.waitFor({ state: "hidden" });
  }

  linkedAhsCardOrHeading(listingName: string): Locator {
    return this.dialog.getByRole("heading", { name: listingName });
  }

  linkedListingHeading(listingName: string): Locator {
    return this.linkedAhsCardOrHeading(listingName);
  }

  /**
   * Changes the listing title to a new value
   */
  async changeTitle(newTitle: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    await this.titleInput.click();
    await this.titleInput.press(selectAll);
    await this.titleInput.press("Backspace");
    await this.titleInput.fill(newTitle);
  }

  async syncTitleWithAhs() {
    await this.syncWithAhsButton.click();
  }

  /**
   * Clicks the create button to create the listing
   */
  async createListing() {
    await this.createButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
    await this.dialog.waitFor({ state: "hidden" });
  }
}
