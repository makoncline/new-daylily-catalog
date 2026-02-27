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
    if (await this.emailInput.isVisible().catch(() => false)) {
      return;
    }

    if (await this.createAccountHeading.isVisible().catch(() => false)) {
      return;
    }

    if (await this.signUpLink.isVisible().catch(() => false)) {
      await this.signUpLink.click();
      await this.createAccountHeading.waitFor({ state: "visible" });
      return;
    }

    const visibleTarget = await Promise.any([
      this.emailInput
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "email"),
      this.createAccountHeading
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "heading"),
      this.signUpLink
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "signup-link"),
    ]).catch(() => null);

    if (visibleTarget === "email" || visibleTarget === "heading") {
      return;
    }

    if (visibleTarget === "signup-link") {
      await this.signUpLink.click();
      await this.createAccountHeading.waitFor({ state: "visible" });
      return;
    }

    throw new Error("Unable to find Clerk sign-up entry state.");
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
