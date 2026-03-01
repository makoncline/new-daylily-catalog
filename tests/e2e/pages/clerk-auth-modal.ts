import { expect, type Locator, type Page } from "@playwright/test";

export class ClerkAuthModal {
  readonly page: Page;
  readonly signUpLink: Locator;
  readonly createAccountHeading: Locator;
  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly codeInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signUpLink = page.getByRole("link", { name: /sign up/i });
    this.createAccountHeading = page.getByRole("heading", {
      name: /create your account/i,
    });
    this.emailInput = page.getByLabel(/email/i).first();
    this.continueButton = page.getByRole("button", { name: /continue/i });
    this.codeInput = page
      .getByRole("textbox", { name: /enter verification code/i })
      .first();
  }

  async startSignUp() {
    if (await this.codeInput.isVisible().catch(() => false)) {
      return;
    }

    if (await this.createAccountHeading.isVisible().catch(() => false)) {
      return;
    }

    await this.emailInput.waitFor({ state: "visible", timeout: 8000 });

    if (await this.signUpLink.isVisible().catch(() => false)) {
      await this.signUpLink.click();
      await Promise.any([
        this.createAccountHeading.waitFor({ state: "visible", timeout: 8000 }),
        this.emailInput.waitFor({ state: "visible", timeout: 8000 }),
      ]);
    }
  }

  async signUpWithEmail(email: string, code: string) {
    await this.startSignUp();
    await this.emailInput.waitFor({ state: "visible" });
    await this.emailInput.fill(email);
    await this.continueButton.click();
    await this.codeInput.waitFor({ state: "visible" });
    await expect(this.codeInput).toBeEnabled();
    const sendCodeWarning = this.page.getByText(
      "You need to send a verification code before attempting to verify.",
    );
    if (await sendCodeWarning.isVisible().catch(() => false)) {
      await this.continueButton.click();
    }
    await this.codeInput.type(code, { delay: 100 });
  }
}
