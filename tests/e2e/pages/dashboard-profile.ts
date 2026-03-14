import { expect, type Locator, type Page } from "@playwright/test";

export class DashboardProfile {
  readonly page: Page;
  readonly heading: Locator;
  readonly gardenNameInput: Locator;
  readonly slugInput: Locator;
  readonly descriptionInput: Locator;
  readonly locationInput: Locator;
  readonly saveChangesButton: Locator;
  readonly contentEditor: Locator;
  readonly profileImage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Profile" });
    this.gardenNameInput = page.getByLabel("Garden Name");
    this.slugInput = page.locator('input[name="slug"]').first();
    this.descriptionInput = page.getByLabel("Description");
    this.locationInput = page.getByLabel("Location");
    this.saveChangesButton = page.getByRole("button", { name: "Save Changes" });
    this.contentEditor = page.locator("#editor");
    this.profileImage = page.getByAltText("Daylily image");
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible" });
    await this.gardenNameInput.waitFor({ state: "visible" });
    await this.descriptionInput.waitFor({ state: "visible" });
  }

  async fillGardenName(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await this.gardenNameInput.click();
    await this.gardenNameInput.press(selectAll);
    await this.gardenNameInput.press("Backspace");
    await this.gardenNameInput.type(text);
    await this.descriptionInput.click();
  }

  async unlockSlugEditing() {
    const warningDialog = this.page.getByRole("alertdialog", {
      name: "Before You Edit Your URL",
    });

    await this.slugInput.click();

    try {
      await warningDialog.waitFor({ state: "visible", timeout: 1500 });
      await warningDialog.getByRole("button", { name: "Continue" }).click();
      await warningDialog.waitFor({ state: "hidden", timeout: 5000 });
    } catch {}

    await this.slugInput.waitFor({ state: "visible" });
    await expect
      .poll(async () => {
        return this.slugInput.evaluate((element) => {
          return element instanceof HTMLInputElement
            ? element.readOnly
            : true;
        });
      })
      .toBe(false);
  }

  async fillSlug(text: string) {
    await this.unlockSlugEditing();
    await this.slugInput.fill(text);
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
    await this.locationInput.click();
  }

  async fillLocation(text: string) {
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";

    await this.locationInput.click();
    await this.locationInput.press(selectAll);
    await this.locationInput.press("Backspace");
    await this.locationInput.type(text);
    await this.heading.click();
  }

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
