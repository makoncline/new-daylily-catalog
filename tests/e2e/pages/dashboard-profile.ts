import { type Locator, type Page } from "@playwright/test";

export class DashboardProfile {
  readonly page: Page;
  readonly heading: Locator;
  readonly gardenNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly locationInput: Locator;
  readonly saveChangesButton: Locator;
  readonly contentEditor: Locator;
  readonly profileImage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Profile" });
    this.gardenNameInput = page.getByLabel("Garden Name");
    this.descriptionInput = page.getByLabel("Description");
    this.locationInput = page.getByLabel("Location");
    this.saveChangesButton = page.getByRole("button", { name: "Save Changes" });
    // EditorJS editor has id="editor"
    this.contentEditor = page.locator("#editor");
    this.profileImage = page.getByAltText("Daylily image");
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible" });
    // Wait for form to be ready
    await this.gardenNameInput.waitFor({ state: "visible" });
    await this.descriptionInput.waitFor({ state: "visible" });
  }

  async fillGardenName(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await this.gardenNameInput.click();
    await this.gardenNameInput.press(selectAll);
    await this.gardenNameInput.press("Backspace");
    await this.gardenNameInput.type(text);
  }

  async goto() {
    await this.page.goto("/dashboard/profile");
  }

  async fillDescription(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await this.descriptionInput.click();
    await this.descriptionInput.press(selectAll);
    await this.descriptionInput.press("Backspace");
    await this.descriptionInput.type(text);
  }

  async fillLocation(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await this.locationInput.click();
    await this.locationInput.press(selectAll);
    await this.locationInput.press("Backspace");
    await this.locationInput.type(text);
  }

  async saveChanges() {
    await this.saveChangesButton.click();
  }

  /**
   * Fill content in the EditorJS editor
   * EditorJS uses a contenteditable div, so we need to find the actual editable element
   */
  async fillContent(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    await this.contentEditor.waitFor({ state: "visible" });
    const editableElement = this.contentEditor.locator(
      '[contenteditable="true"]',
    );
    await editableElement.waitFor({ state: "visible" });

    await editableElement.click();
    await editableElement.press(selectAll);
    await editableElement.press("Backspace");
    await editableElement.type(text);
    await this.heading.click();
  }
}
