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
    await this.imageItemById(imageId)
      .getByRole("button", { name: /view/i })
      .click();
  }

  async confirmImageDelete() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async dragImageBefore(sourceId: string, targetId: string) {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      let mouseIsDown = false;
      try {
        const sourceHandle = this.imageDragHandleById(sourceId);
        const targetHandle = this.imageDragHandleById(targetId);

        await sourceHandle.waitFor({ state: "visible" });
        await targetHandle.waitFor({ state: "visible" });
        await sourceHandle.scrollIntoViewIfNeeded();
        await targetHandle.scrollIntoViewIfNeeded();

        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetHandle.boundingBox();

        if (!sourceBox || !targetBox) {
          throw new Error(
            "Unable to drag image: source or target handle has no box",
          );
        }

        await this.page.mouse.move(
          sourceBox.x + sourceBox.width / 2,
          sourceBox.y + sourceBox.height / 2,
        );
        await this.page.mouse.down();
        mouseIsDown = true;
        await this.page.mouse.move(
          targetBox.x + targetBox.width / 2,
          targetBox.y + targetBox.height / 2,
          { steps: 16 },
        );
        await this.page.mouse.up();
        mouseIsDown = false;
        return;
      } catch (error) {
        lastError = error;
        if (mouseIsDown) {
          await this.page.mouse.up().catch(() => undefined);
        }
        await this.page.waitForTimeout(250);
      }
    }

    throw lastError;
  }

  async imageOrderIds(): Promise<string[]> {
    return this.imageItems().evaluateAll((elements) =>
      elements.flatMap((element) => {
        const id = element.getAttribute("data-image-id");
        return id ? [id] : [];
      }),
    );
  }
}
