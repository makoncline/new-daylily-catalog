import type { Locator, Page } from "@playwright/test";

export class StartMembershipPage {
  readonly page: Page;
  readonly container: Locator;
  readonly startTrialButton: Locator;
  readonly continueForNowLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("start-membership-page");
    this.startTrialButton = page.getByTestId("start-membership-checkout");
    this.continueForNowLink = page.getByTestId("start-membership-continue");
  }

  async isReady() {
    await this.container.waitFor({ state: "visible" });
    await this.startTrialButton.waitFor({ state: "visible" });
    await this.continueForNowLink.waitFor({ state: "visible" });
  }
}
