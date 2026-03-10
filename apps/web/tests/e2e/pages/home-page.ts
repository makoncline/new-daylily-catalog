import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly dashboardButton: Locator;
  readonly heroHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardButton = page.getByRole("button", { name: "Dashboard" });
    this.heroHeading = page.getByRole("heading", { level: 1 });
  }

  async goto() {
    await this.page.goto("/");
  }

  async isReady() {
    await this.heroHeading.waitFor({ state: "visible" });
    await this.dashboardButton.waitFor({ state: "visible" });
  }

  async openDashboard() {
    await this.dashboardButton.click();
  }
}
