import { expect, test as setup } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getAtlasRoot } from "../../scripts/agent-atlas-paths.mjs";

const authDirectory = path.join(getAtlasRoot(process.cwd()), ".auth");
function recordAuthRuntime(authFile: string) {
  writeFileSync(
    `${authFile}.runtime`,
    `${process.env.AGENT_ATLAS_AUTH_RUNTIME ?? (process.env.HERMETIC_MODE === "1" ? "hermetic" : "connected")}\n`,
  );
}

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
  {
    key: "new-unpaid",
    email: "new-unpaid+clerk_test@hermetic.local",
    hermeticKey: "new-unpaid",
    hermeticOnly: true,
  },
  {
    key: "billing-past-due",
    email: "billing-past-due+clerk_test@hermetic.local",
    hermeticKey: "billing-past-due",
    hermeticOnly: true,
  },
  {
    key: "billing-canceled",
    email: "billing-canceled+clerk_test@hermetic.local",
    hermeticKey: "billing-canceled",
    hermeticOnly: true,
  },
  {
    key: "free-at-limit",
    email: "free-at-limit+clerk_test@hermetic.local",
    hermeticKey: "free-at-limit",
    hermeticOnly: true,
  },
  {
    key: "profile-editor",
    email: "profile-editor+clerk_test@hermetic.local",
    hermeticKey: "profile-editor",
    hermeticOnly: true,
  },
] as const;

for (const persona of personas) {
  setup(`authenticate ${persona.key}`, async ({ page }) => {
    setup.skip(
      "hermeticOnly" in persona &&
        persona.hermeticOnly &&
        process.env.HERMETIC_MODE !== "1",
      "Account-state personas only exist in the guarded hermetic runtime.",
    );
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
      recordAuthRuntime(path.join(authDirectory, `${persona.key}.json`));
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
    const authFile = path.join(authDirectory, `${persona.key}.json`);
    await page.context().storageState({ path: authFile });
    recordAuthRuntime(authFile);
  });
}
