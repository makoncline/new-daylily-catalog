import type { Locator, Page } from "@playwright/test";

export class ImageManager {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  imageGrid(): Locator {
    return this.page.getByTestId("image-manager-grid");
  }

  imageItems(): Locator {
    return this.page.getByTestId("image-item");
  }

  imageItemById(imageId: string): Locator {
    return this.page.locator(
      `[data-testid="image-item"][data-image-id="${imageId}"]`,
    );
  }

  imageDragHandleById(imageId: string): Locator {
    return this.page.locator(
      `[data-testid="image-drag-handle"][data-image-id="${imageId}"]`,
    );
  }

  imageDeleteButtonById(imageId: string): Locator {
    return this.page.locator(
      `[data-testid="image-delete-button"][data-image-id="${imageId}"]`,
    );
  }

  async openImagePreviewById(imageId: string) {
    await this.imageItemById(imageId).getByRole("button", { name: /view/i }).click();
  }

  async confirmImageDelete() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async dragImageBefore(sourceId: string, targetId: string) {
    const sourceHandle = this.imageDragHandleById(sourceId);
    const targetHandle = this.imageDragHandleById(targetId);

    await sourceHandle.waitFor({ state: "visible", timeout: 10000 });
    await targetHandle.waitFor({ state: "visible", timeout: 10000 });
    await sourceHandle.scrollIntoViewIfNeeded();
    await targetHandle.scrollIntoViewIfNeeded();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error("Unable to drag image: source or target handle has no box");
    }

    await this.page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 16 },
    );
    await this.page.mouse.up();
  }

  async imageOrderIds(): Promise<string[]> {
    return this.imageItems().evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute("data-image-id"))
        .filter((id): id is string => Boolean(id)),
    );
  }
}
