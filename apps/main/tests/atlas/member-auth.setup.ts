import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const authState = process.env.ATLAS_AUTH_STATE;

setup("authenticate realistic catalog member", async ({ page }) => {
  if (!authState) throw new Error("ATLAS_AUTH_STATE is required.");

  await page.goto("/sign-in");
  const emailInput = page.getByLabel(/email/i).first();
  await expect(emailInput).toBeVisible();
  await emailInput.fill("prodlike+clerk_test_rollingoaks@example.com");
  await page.getByRole("button", { name: /continue/i }).click();

  const codeInput = page
    .getByRole("textbox", { name: /enter verification code/i })
    .first();
  await expect(codeInput).toBeVisible();
  const sendCodeWarning = page.getByText(
    "You need to send a verification code before attempting to verify.",
  );
  if (await sendCodeWarning.isVisible()) {
    await page
      .getByRole("button", { name: /didn't receive a code\? resend/i })
      .click();
    await expect(sendCodeWarning).toBeHidden();
  }
  await codeInput.pressSequentially("424242", { delay: 100 });

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  mkdirSync(path.dirname(authState), { recursive: true });
  await page.context().storageState({ path: authState });
});
