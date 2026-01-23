import { test, expect } from "../../e2e/test-setup";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { TEST_USER, createAuthedUser } from "../../src/lib/test-utils/e2e-users";

test.describe("manual sign-in @local", () => {
  let consoleMessages: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    page.on("console", (message) => {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("page.html", {
        body: await page.content(),
        contentType: "text/html",
      });
      if (consoleMessages.length > 0) {
        await testInfo.attach("console.log", {
          body: consoleMessages.join("\n"),
          contentType: "text/plain",
        });
      }
    }
  });

  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      await createAuthedUser(db);
    });
  });

  test("home -> dashboard button -> Clerk modal -> dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Daylily Catalog");

    await page.getByRole("button", { name: "Dashboard" }).click();

    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_USER.email);

    await page.getByRole("button", { name: /continue/i }).click();

    const codeInput = page.getByLabel(/code/i).first();
    await expect(codeInput).toBeVisible({ timeout: 10000 });
    await codeInput.fill("424242");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible({ timeout: 30000 });
  });
});
