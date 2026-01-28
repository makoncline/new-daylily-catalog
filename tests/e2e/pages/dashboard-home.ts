import type { Locator, Page } from "@playwright/test";

export class DashboardHome {
  readonly page: Page;
  readonly profileCompletionPercentage: Locator;
  readonly catalogProgressPercentage: Locator;
  readonly upgradeToProButton: Locator;
  readonly completeProfileButton: Locator;
  readonly completeProfileCard: Locator;
  readonly heading: Locator;
  readonly content: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByTestId("dashboard-heading");
    this.content = page.getByTestId("dashboard-content");
    this.profileCompletionPercentage = page.getByTestId(
      "dashboard-profile-completion-percent",
    );
    this.catalogProgressPercentage = page.getByTestId(
      "dashboard-catalog-progress-percent",
    );
    this.upgradeToProButton = page.getByTestId("dashboard-upgrade-to-pro");
    this.completeProfileButton = page.getByRole("link", {
      name: "Complete Your Profile",
    });
    this.completeProfileCard = page.getByTestId(
      "dashboard-profile-completion-card",
    );
  }

  async waitForLoaded() {
    await this.isReady();
  }

  /**
   * Get the profile completion percentage as a number
   */
  async getProfileCompletionPercentage(): Promise<number | null> {
    const count = await this.profileCompletionPercentage.count();
    if (count === 0) {
      return null;
    }
    const text = await this.profileCompletionPercentage.first().textContent();
    if (!text) {
      return null;
    }
    const match = /(\d+)%/.exec(text);
    return match ? parseInt(match[1] ?? "0", 10) : null;
  }

  /**
   * Get the catalog progress percentage as a number
   */
  async getCatalogProgressPercentage(): Promise<number | null> {
    const count = await this.catalogProgressPercentage.count();
    if (count === 0) {
      return null;
    }
    const text = await this.catalogProgressPercentage.first().textContent();
    if (!text) {
      return null;
    }
    const match = /(\d+)%/.exec(text);
    return match ? parseInt(match[1] ?? "0", 10) : null;
  }

  async isReady() {
    await this.heading.waitFor({ state: "visible", timeout: 30000 });
    await this.content.waitFor({ state: "visible", timeout: 30000 });
  }
}
