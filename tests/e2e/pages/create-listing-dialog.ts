import type { Locator, Page } from "@playwright/test";

export class CreateListingDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly ahsListingSelectButton: Locator;
  readonly titleInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The dialog should be visible after clicking Create Listing button
    this.dialog = page.getByRole("dialog").filter({
      hasText: "Create New Listing",
    });
    // The AHS listing select button (opens another dialog)
    // Note: This button has role="combobox" not role="button"
    // Use the id attribute for more reliable selection
    this.ahsListingSelectButton = this.dialog.locator("#ahs-listing-select");
    // The title input field
    this.titleInput = this.dialog.getByLabel("Listing Title");
    // The create button in the footer
    this.createButton = this.dialog
      .getByRole("button", { name: "Create Listing" })
      .last(); // Use last() to avoid matching buttons in nested dialogs
    // The cancel button
    this.cancelButton = this.dialog.getByRole("button", { name: "Cancel" });
  }

  async isReady() {
    await this.dialog.waitFor({ state: "visible", timeout: 10000 });
    await this.ahsListingSelectButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
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
    // Click the select button to open the AHS listing dialog
    await this.ahsListingSelectButton.click();

    // Wait for the AHS listing dialog to open
    const ahsDialog = this.page
      .getByRole("dialog")
      .filter({ hasText: "Select Daylily Database Listing" });
    await ahsDialog.waitFor({ state: "visible", timeout: 10000 });

    // Find the search input in the AHS dialog
    const searchInput = ahsDialog.getByPlaceholder("Search AHS listings...");
    await searchInput.waitFor({ state: "visible", timeout: 5000 });

    // Type the search query (partial name)
    await searchInput.fill(searchQuery);

    // Wait for results to appear (the CommandItem with the listing name)
    // CommandItem might be rendered as a button or div, so we use text content
    const listingOption = ahsDialog
      .locator('[data-slot="command-item"]')
      .filter({ hasText: expectedListingName });
    await listingOption.waitFor({ state: "visible", timeout: 10000 });

    // Click the listing option to select it
    await listingOption.click();
  }

  linkedListingHeading(listingName: string): Locator {
    return this.dialog.getByRole("heading", { name: listingName });
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

  /**
   * Clicks the create button to create the listing
   */
  async createListing() {
    await this.createButton.click();
  }
}
