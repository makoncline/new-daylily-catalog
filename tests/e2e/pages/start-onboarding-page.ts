import type { Locator, Page } from "@playwright/test";

export class StartOnboardingPage {
  readonly page: Page;
  readonly container: Locator;
  readonly primaryActionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("start-onboarding-page");
    this.primaryActionButton = page.getByTestId("start-onboarding-primary-action");
  }

  async isReady() {
    await this.container.waitFor({ state: "visible" });
    await this.primaryActionButton.waitFor({ state: "visible" });
  }
}
