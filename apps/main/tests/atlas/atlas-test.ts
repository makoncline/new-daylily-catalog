import { expect, test as base } from "@playwright/test";
import type { ConsoleMessage, Locator, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  assertNoUnexpectedBrowserDiagnostics,
  diagnosticLineFromPlaywrightConsole,
} from "../../scripts/atlas-browser-diagnostics.mjs";
import { getAtlasState } from "../../scripts/atlas-flows.mjs";
import { prepareAtlasCapture } from "./atlas-capture-readiness";
export { expect };

export const test = base.extend<{ atlasBrowserDiagnostics: void }>({
  atlasBrowserDiagnostics: [
    async ({ page }, use) => {
      const diagnostics: string[] = [];
      const onConsole = (message: ConsoleMessage) => {
        const line = diagnosticLineFromPlaywrightConsole(
          message.type(),
          message.text(),
        );
        if (line) diagnostics.push(line);
      };
      const onPageError = (error: Error) => {
        const line = diagnosticLineFromPlaywrightConsole(
          "error",
          error.message,
        );
        if (line) diagnostics.push(line);
      };

      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      try {
        await use();
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }
      assertNoUnexpectedBrowserDiagnostics(diagnostics.join("\n"));
    },
    { auto: true },
  ],
});

const interactionSurfaceSelectors = [
  '[role="dialog"]:visible',
  '[role="alertdialog"]:visible',
  '[role="menu"]:visible',
  '[role="listbox"]:visible',
];

async function visibleInteractionSurface(page: Page) {
  for (const selector of interactionSurfaceSelectors) {
    const surfaces = page.locator(selector);
    if ((await surfaces.count()) > 0) return surfaces.last();
  }
  return undefined;
}

async function expandVerticalScrollContainers(target: Locator) {
  await target.evaluate((root) => {
    const elements = [root, ...root.querySelectorAll("*")];
    for (const element of elements) {
      if (
        !(element instanceof HTMLElement) ||
        element instanceof HTMLTextAreaElement ||
        element === document.documentElement ||
        element === document.body
      ) {
        continue;
      }
      const style = getComputedStyle(element);
      const verticallyScrollable =
        element.scrollHeight > element.clientHeight + 1 &&
        (style.overflowY === "auto" || style.overflowY === "scroll");
      if (!verticallyScrollable) continue;

      element.dataset.atlasOriginalStyle =
        element.getAttribute("style") ?? "__no_inline_style__";
      element.style.setProperty("height", "auto", "important");
      element.style.setProperty("max-height", "none", "important");
      element.style.setProperty("overflow-y", "visible", "important");
    }
  });
  await target.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function restoreVerticalScrollContainers(page: Page) {
  await page.locator("[data-atlas-original-style]").evaluateAll((elements) => {
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue;
      const originalStyle = element.dataset.atlasOriginalStyle;
      delete element.dataset.atlasOriginalStyle;
      if (originalStyle === "__no_inline_style__") {
        element.removeAttribute("style");
      } else if (originalStyle !== undefined) {
        element.setAttribute("style", originalStyle);
      }
    }
  });
}

function pngHeight(image: Buffer) {
  if (image.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Atlas screenshots must be PNG images.");
  }
  return image.readUInt32BE(20);
}

export async function captureAtlasState(page: Page, stateId: string) {
  const captureDirectory = process.env.ATLAS_CAPTURE_DIR;
  if (!captureDirectory) throw new Error("ATLAS_CAPTURE_DIR is required.");
  const stateItem = getAtlasState(stateId) as { capture: string };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.locator("[data-nextjs-dialog], #webpack-dev-server-client-overlay"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Open issues overlay/i }),
    `${stateId} must have zero Next development issues before capture`,
  ).toHaveCount(0);
  mkdirSync(captureDirectory, { recursive: true });
  const interactionSurface = await visibleInteractionSurface(page);
  const target = interactionSurface ?? page.locator("html");
  await expandVerticalScrollContainers(target);

  try {
    await prepareAtlasCapture(page, interactionSurface);
    const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
    const expectedHeight = interactionSurface
      ? ((await interactionSurface.boundingBox())?.height ?? 0) *
        devicePixelRatio
      : await page.evaluate(
          () => document.documentElement.scrollHeight * window.devicePixelRatio,
        );
    const screenshot = interactionSurface
      ? await interactionSurface.screenshot({ animations: "disabled" })
      : await page.screenshot({
          fullPage: true,
          animations: "disabled",
        });
    const actualHeight = pngHeight(screenshot);
    expect(
      actualHeight,
      `${stateId} must capture the complete ${interactionSurface ? "component" : "page"}, never only the viewport`,
    ).toBeGreaterThanOrEqual(Math.floor(expectedHeight) - 2);
    writeFileSync(path.join(captureDirectory, stateItem.capture), screenshot);
  } finally {
    await restoreVerticalScrollContainers(page);
  }
}
