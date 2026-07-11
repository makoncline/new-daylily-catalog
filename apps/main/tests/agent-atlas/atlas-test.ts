import { expect, test as base } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type AtlasFixtures = {
  diagnostics: DiagnosticState;
};

type DiagnosticState = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{ method: string; url: string; error: string }>;
};

const diagnosticsByPage = new WeakMap<Page, DiagnosticState>();

export const test = base.extend<AtlasFixtures>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const state: DiagnosticState = {
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
      };
      diagnosticsByPage.set(page, state);
      await page.emulateMedia({ reducedMotion: "reduce" });

      page.on("console", (message) => {
        if (message.type() === "error")
          state.consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => state.pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        state.failedRequests.push({
          method: request.method(),
          url: request.url(),
          error: request.failure()?.errorText ?? "unknown failure",
        });
      });

      await use(state);

      await testInfo.attach("browser-diagnostics.json", {
        body: JSON.stringify(state, null, 2),
        contentType: "application/json",
      });
      expect(state.pageErrors, "uncaught browser errors").toEqual([]);
      expect(state.consoleErrors, "browser console errors").toEqual([]);
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
    await Promise.race([
      Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
    ]);
  });
  await page.waitForTimeout(300);
  await expect(page.locator("body")).not.toBeEmpty();
  if (process.env.AGENT_ATLAS_SIMULATE_FAILURE !== "1") {
    await expect(
      page.locator(
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
      ),
    ).toHaveCount(0);
  }
  const screenshot = await page.screenshot({ fullPage: true });
  const captureDirectory = path.join(
    process.cwd(),
    "local",
    "agent-atlas",
    "gallery-captures",
  );
  const captureKey = `${testInfo.project.name}-${name}`;
  const diagnostics = diagnosticsByPage.get(page) ?? {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
  const story = name.includes("onboarding")
    ? "onboarding"
    : testInfo.project.name.startsWith("anonymous")
      ? "public"
      : name.includes("dialog") ||
          name.includes("filter") ||
          name.includes("picker") ||
          name.includes("tag")
        ? "dashboard-interactions"
        : "dashboard-base";
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
        viewport: page.viewportSize(),
        story,
        diagnostics,
        rerunCommand: `pnpm agent:capture:story -- ${story}`,
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
