import { chromium, expect } from "@playwright/test";
import {
  allowedProductionRequest,
  authFailureCategory,
  blockedRequestLabel,
  productionOrigin,
  SmokePrerequisite,
} from "../../scripts/production-smoke-config.mjs";

/**
 * @param {ReturnType<import('../../scripts/production-smoke-config.mjs').productionSmokeConfig>} config
 * @param {string} password
 */
export async function runProductionSmoke(config, password) {
  let stage = "browser start";
  /** @type {import('@playwright/test').Browser | undefined} */
  let browser;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {Map<string, number>} */
  const blockedRequests = new Map();
  let authFailure = "not-observed";
  const counts = {
    consoleErrors: 0,
    pageErrors: 0,
    failedAppRequests: 0,
    blockedAppRequests: 0,
  };
  try {
    browser = await chromium.launch({ channel: "chrome", headless: false });
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(30_000);
    let accountVerified = false;
    const readAuthFailure = async () => {
      const text = await page
        .locator(
          '[role="alert"]:visible, .cl-formFieldErrorText:visible, h1:visible, h2:visible, label:visible',
        )
        .allTextContents()
        .catch(() => []);
      return authFailureCategory(text.join(" ").slice(0, 4_000));
    };

    context.on("console", (message) => {
      if (message.type() === "error") counts.consoleErrors++;
    });
    context.on("weberror", () => counts.pageErrors++);
    context.on("requestfailed", (request) => {
      if (
        new URL(request.url()).origin === productionOrigin &&
        request.failure()?.errorText !== "net::ERR_ABORTED"
      )
        counts.failedAppRequests++;
    });
    context.on("response", (response) => {
      if (
        new URL(response.url()).origin === productionOrigin &&
        response.status() >= 400
      )
        counts.failedAppRequests++;
    });

    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        url.origin === productionOrigin &&
        url.pathname.startsWith("/dashboard") &&
        !accountVerified
      ) {
        accountVerified = await page
          .evaluate(({ email, clerkUserId }) => {
            const clerkWindow =
              /** @type {Window & {Clerk?: ReturnType<import('@clerk/nextjs').useClerk>}} */ (
                window
              );
            const user = clerkWindow.Clerk?.user;
            return (
              user?.id === clerkUserId &&
              user?.primaryEmailAddress?.emailAddress?.toLowerCase() ===
                email.toLowerCase()
            );
          }, config)
          .catch(() => false);
      }
      const externalNavigation =
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame() &&
        url.origin !== productionOrigin;
      if (
        externalNavigation ||
        !allowedProductionRequest(
          request.url(),
          request.method(),
          accountVerified,
        )
      ) {
        counts.blockedAppRequests++;
        const label = externalNavigation
          ? "external-navigation"
          : blockedRequestLabel(request.url());
        if (blockedRequests.has(label) || blockedRequests.size < 10)
          blockedRequests.set(label, (blockedRequests.get(label) ?? 0) + 1);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    const run = async () => {
      stage = "existing public profile and deployed release";
      const runtimeResponse = page
        .waitForResponse(
          (response) =>
            new URL(response.url()).origin === productionOrigin &&
            new URL(response.url()).pathname === "/api/runtime-config",
        )
        .catch(() => null);
      const profileResponse = await page.goto(
        `${productionOrigin}/${config.profileSlug}`,
      );
      expect(profileResponse?.status()).toBe(200);
      await expect(page.locator("#profile h1")).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${productionOrigin}/${config.profileSlug}`,
      );
      const runtime = await runtimeResponse;
      if (!runtime) throw new Error("Runtime config did not load.");
      expect(runtime.status()).toBe(200);
      expect((await runtime.json()).sentry?.release).toBe(config.release);
      console.log("PASS: existing public profile and exact deployed release");

      stage = "ordinary password sign-in";
      await page.goto(`${productionOrigin}/sign-in`);
      const emailInput = page.getByLabel(/email/i).first();
      await expect(emailInput).toBeVisible({ timeout: 30_000 });
      await emailInput.fill(config.email);
      const passwordInput = page.locator('input[type="password"]');
      if (!(await passwordInput.isVisible()))
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
      try {
        await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
      } catch {
        authFailure = await readAuthFailure();
        throw new SmokePrerequisite(
          `The ordinary password form did not load. Auth category: ${authFailure}. No alternate sign-in was attempted.`,
        );
      }
      await passwordInput.fill(password);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      try {
        await expect(page).toHaveURL(`${productionOrigin}/dashboard`, {
          timeout: 30_000,
        });
      } catch {
        authFailure = await readAuthFailure();
        throw new SmokePrerequisite(
          `Password sign-in did not reach the verified dashboard. Auth category: ${authFailure}. A timeout alone does not confirm MFA or access denial.`,
        );
      }
      expect(accountVerified).toBe(true);
      await expect(page.getByTestId("dashboard-heading")).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator(`[title="${config.email}" i]`)).toBeAttached({
        timeout: 30_000,
      });
      console.log("PASS: password sign-in and existing account identity");

      stage = "Listings and existing listing editor";
      await page.getByTestId("dashboard-nav-listings").click();
      await expect(page.getByTestId("listing-table")).toBeVisible({
        timeout: 30_000,
      });
      await page.getByTestId("listing-row-actions-trigger").first().click();
      await page.getByTestId("listing-row-action-edit").click();
      const listingEditor = page.getByRole("region", { name: "Edit listing" });
      await expect(
        listingEditor.getByLabel("Name", { exact: true }),
      ).toBeVisible({ timeout: 30_000 });
      await listingEditor
        .getByRole("button", { name: "Back to listings" })
        .click();
      await expect(listingEditor).toBeHidden();
      console.log("PASS: Listings and existing listing editor");

      stage = "Lists and existing list editor";
      await page.getByTestId("dashboard-nav-lists").click();
      await expect(page.getByTestId("list-table")).toBeVisible({
        timeout: 30_000,
      });
      await page.getByTestId("list-row-actions-trigger").first().click();
      await page.getByTestId("list-row-action-edit").click();
      const listEditor = page.getByRole("region", { name: "Edit list" });
      await expect(listEditor.getByLabel("Title", { exact: true })).toBeVisible(
        { timeout: 30_000 },
      );
      await listEditor.getByRole("button", { name: "Back to lists" }).click();
      await expect(listEditor).toBeHidden();
      console.log("PASS: Lists and existing list editor");

      stage = "Profile and authenticated reload";
      await page.getByTestId("dashboard-nav-profile").click();
      await expect(page.getByLabel("Profile URL", { exact: true })).toHaveValue(
        config.profileSlug,
        { timeout: 30_000 },
      );
      await expect(
        page.getByLabel("Garden Name", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(`${productionOrigin}/dashboard/profile`);
      await expect(page.getByLabel("Profile URL", { exact: true })).toHaveValue(
        config.profileSlug,
        { timeout: 30_000 },
      );
      console.log("PASS: Profile and authenticated reload");

      stage = "browser console and app requests";
      expect(counts).toEqual({
        consoleErrors: 0,
        pageErrors: 0,
        failedAppRequests: 0,
        blockedAppRequests: 0,
      });
      console.log("PASS: browser console and ordinary app requests");
    };
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 180_000);
      }),
    ]);
  } catch (error) {
    console.error(
      `STOP: ${stage}. Counts: ${JSON.stringify(counts)}. Blocked: ${JSON.stringify(Object.fromEntries(blockedRequests))}. Auth category: ${authFailure}.`,
    );
    throw error instanceof SmokePrerequisite
      ? error
      : new Error("Production smoke failed.");
  } finally {
    clearTimeout(timer);
    await browser?.close();
  }
}
