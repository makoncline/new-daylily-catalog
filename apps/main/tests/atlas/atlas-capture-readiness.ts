import type { ElementHandle, Locator, Page } from "@playwright/test";

const IMAGE_SETTLE_TIMEOUT_MS = 15_000;

async function waitForVisibleImages(
  page: Page,
  root: ElementHandle<HTMLElement | SVGElement> | null,
) {
  await page.waitForFunction(
    (captureRoot) => {
      const images =
        captureRoot instanceof Element
          ? [...captureRoot.querySelectorAll("img")]
          : [...document.images];
      return images
        .filter((image) => {
          const style = getComputedStyle(image);
          return (
            image.getClientRects().length > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .every((image) => image.complete);
    },
    root,
    { timeout: IMAGE_SETTLE_TIMEOUT_MS },
  );
  await page.evaluate(async (captureRoot) => {
    const images =
      captureRoot instanceof Element
        ? [...captureRoot.querySelectorAll("img")]
        : [...document.images];
    const requestedImages = images.filter(
      (image) => image.complete && image.naturalWidth > 0,
    );
    await Promise.all(
      requestedImages.map(async (image) => {
        try {
          await image.decode();
        } catch {
          // A completed image may become unavailable between readiness and decode.
        }
      }),
    );
  }, root);
}

export async function prepareAtlasCapture(page: Page, target?: Locator) {
  await page.evaluate(() => document.fonts.ready);
  const root = target ? await target.elementHandle() : null;
  if (target && !root) throw new Error("Atlas capture target is not attached.");
  let originalScroll: { x: number; y: number } | undefined;
  try {
    originalScroll = await page.evaluate(async (captureRoot) => {
      const position = { x: window.scrollX, y: window.scrollY };
      const scrollingElement = document.scrollingElement;
      if (!scrollingElement) return position;

      const nextPaint = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      const viewportHeight = Math.max(window.innerHeight, 1);
      const documentMaximumScroll = Math.max(
        scrollingElement.scrollHeight - viewportHeight,
        0,
      );
      const scrollStep = Math.max(Math.floor(viewportHeight * 0.8), 1);
      const rootRect =
        captureRoot instanceof Element
          ? captureRoot.getBoundingClientRect()
          : undefined;
      const captureTop = rootRect
        ? Math.min(
            documentMaximumScroll,
            Math.max(0, window.scrollY + rootRect.top),
          )
        : 0;
      const captureBottom = rootRect
        ? window.scrollY + rootRect.bottom
        : scrollingElement.scrollHeight;
      const maximumScroll = Math.min(
        documentMaximumScroll,
        Math.max(captureTop, captureBottom - viewportHeight),
      );

      for (let y = captureTop; y < maximumScroll; y += scrollStep) {
        window.scrollTo(position.x, y);
        await nextPaint();
      }
      window.scrollTo(position.x, maximumScroll);
      await nextPaint();
      return position;
    }, root);
    await waitForVisibleImages(page, root);
  } finally {
    if (originalScroll) {
      await page.evaluate(({ x, y }) => window.scrollTo(x, y), originalScroll);
    }
    await root?.dispose();
  }
}
