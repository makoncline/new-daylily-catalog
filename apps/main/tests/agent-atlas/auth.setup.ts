import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const authDirectory = path.join(process.cwd(), "local", "agent-atlas", ".auth");

const personas = [
  {
    key: "rolling-oaks",
    email: "prodlike+clerk_test_rollingoaks@example.com",
    hermeticKey: "pro-primary",
  },
  {
    key: "plant-fancy-gardens",
    email: "prodlike+clerk_test_plantfancy@example.com",
    hermeticKey: "pro-secondary",
  },
] as const;

for (const persona of personas) {
  setup(`authenticate ${persona.key}`, async ({ page }) => {
    await page.goto("/sign-in");
    if (process.env.HERMETIC_MODE === "1") {
      await page
        .locator(`[data-hermetic-persona="${persona.hermeticKey}"]`)
        .click();
      await expect(page).toHaveURL(/\/dashboard/);
      mkdirSync(authDirectory, { recursive: true });
      await page.context().storageState({
        path: path.join(authDirectory, `${persona.key}.json`),
      });
      return;
    }

    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(persona.email);
    await page
      .getByRole("button", { name: /continue/i })
      .first()
      .click();

    const codeInput = page
      .getByRole("textbox", { name: /enter verification code/i })
      .first();
    await expect(codeInput).toBeVisible();
    const sendCodeWarning = page.getByText(
      "You need to send a verification code before attempting to verify.",
    );
    if (await sendCodeWarning.isVisible().catch(() => false)) {
      await page
        .getByRole("button", { name: /continue/i })
        .last()
        .click();
    }
    await codeInput.type("424242", { delay: 100 });

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    mkdirSync(authDirectory, { recursive: true });
    await page.context().storageState({
      path: path.join(authDirectory, `${persona.key}.json`),
    });
  });
}
