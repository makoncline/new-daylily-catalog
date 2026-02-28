import { expect, type Locator, type Page } from "@playwright/test";

export class SubscribeSuccessPage {
  readonly page: Page;
  readonly container: Locator;
  readonly dashboardLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("subscribe-success-page");
    this.dashboardLink = page.getByTestId("subscribe-success-dashboard-link");
  }

  async isReady() {
    await expect(this.container).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: /Welcome to Pro/i }),
    ).toBeVisible();
    await expect(this.dashboardLink).toBeVisible();
  }
}
