import { expect, test as base } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type AtlasFixtures = {
  diagnostics: void;
};

export const test = base.extend<AtlasFixtures>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: Array<{ method: string; url: string; error: string }> =
        [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        failedRequests.push({
          method: request.method(),
          url: request.url(),
          error: request.failure()?.errorText ?? "unknown failure",
        });
      });

      await use();

      await testInfo.attach("browser-diagnostics.json", {
        body: JSON.stringify({ consoleErrors, pageErrors, failedRequests }, null, 2),
        contentType: "application/json",
      });
      expect(pageErrors, "uncaught browser errors").toEqual([]);
      expect(consoleErrors, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

export async function captureCheckpoint(
  page: Page,
  testInfo: TestInfo,
  name: string,
  description?: string,
) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.race([
      Promise.all(
        [...document.images].map(
          (image) =>
            image.complete ||
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
    ]);
  });
  await page.waitForTimeout(300);
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.locator(
      "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
    ),
  ).toHaveCount(0);
  const screenshot = await page.screenshot({ fullPage: true });
  const captureDirectory = path.join(
    process.cwd(),
    "local",
    "agent-atlas",
    "gallery-captures",
  );
  const captureKey = `${testInfo.project.name}-${name}`;
  mkdirSync(captureDirectory, { recursive: true });
  writeFileSync(path.join(captureDirectory, `${captureKey}.png`), screenshot);
  writeFileSync(
    path.join(captureDirectory, `${captureKey}.json`),
    JSON.stringify(
      {
        key: captureKey,
        name,
        description,
        project: testInfo.project.name,
        title: await page.title(),
        url: page.url(),
      },
      null,
      2,
    ),
  );

  await testInfo.attach(`${name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach(`${name}.json`, {
    body: JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        project: testInfo.project.name,
        title: await page.title(),
        url: page.url(),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}
