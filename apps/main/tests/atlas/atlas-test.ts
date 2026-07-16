import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getAtlasState } from "../../scripts/atlas-flows.mjs";
export { expect, test };
export async function captureAtlasState(
  page: Page,
  stateId: string,
  { fullPage = true }: { fullPage?: boolean } = {},
) {
  const captureDirectory = process.env.ATLAS_CAPTURE_DIR;
  if (!captureDirectory) throw new Error("ATLAS_CAPTURE_DIR is required.");
  const stateItem = getAtlasState(stateId);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visibleImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    await Promise.all(
      visibleImages.map(
        (image) =>
          image.complete ||
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  });
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.locator("[data-nextjs-dialog], #webpack-dev-server-client-overlay"),
  ).toHaveCount(0);
  mkdirSync(captureDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(captureDirectory, stateItem.capture),
    fullPage,
    animations: "disabled",
  });
}
