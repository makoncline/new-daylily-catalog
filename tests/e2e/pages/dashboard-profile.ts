import type { Locator, Page } from "@playwright/test";

export class DashboardProfile {
  readonly page: Page;
  readonly heading: Locator;
  readonly descriptionInput: Locator;
  readonly locationInput: Locator;
  readonly contentEditor: Locator;
  readonly profileImage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Profile" });
    this.descriptionInput = page.getByLabel("Description");
    this.locationInput = page.getByLabel("Location");
    // EditorJS editor has id="editor"
    this.contentEditor = page.locator("#editor");
    this.profileImage = page.getByAltText("Daylily image");
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible", timeout: 30000 });
    // Wait for form to be ready
    await this.descriptionInput.waitFor({ state: "visible", timeout: 10000 });
  }

  async goto() {
    await this.page.goto("/dashboard/profile");
  }

  /**
   * Fill description field and wait for auto-save
   */
  async fillDescription(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/trpc/userProfile.update") &&
        response.request().method() === "POST",
    );

    await this.descriptionInput.click();
    await this.descriptionInput.press(selectAll);
    await this.descriptionInput.press("Backspace");
    await this.descriptionInput.type(text);
    await this.locationInput.click();

    await saveResponse;
  }

  /**
   * Fill location field and wait for auto-save
   */
  async fillLocation(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/trpc/userProfile.update") &&
        response.request().method() === "POST",
    );

    await this.locationInput.click();
    await this.locationInput.press(selectAll);
    await this.locationInput.press("Backspace");
    await this.locationInput.type(text);
    await this.heading.click();

    await saveResponse;
  }

  /**
   * Fill content in the EditorJS editor
   * EditorJS uses a contenteditable div, so we need to find the actual editable element
   */
  async fillContent(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    await this.contentEditor.waitFor({ state: "visible", timeout: 10000 });
    const editableElement = this.contentEditor.locator(
      '[contenteditable="true"]',
    );
    await editableElement.waitFor({ state: "visible", timeout: 10000 });
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/trpc/userProfile.updateContent") &&
        response.request().method() === "POST",
    );

    await editableElement.click();
    await editableElement.press(selectAll);
    await editableElement.press("Backspace");
    await editableElement.type(text);
    await this.heading.click();

    await Promise.all([
      saveResponse,
      this.page.waitForSelector('text="Content saved"', { timeout: 5000 }),
    ]).catch(async () => {
      await saveResponse;
    });
  }
}
