import { expect, type Locator, type Page } from "@playwright/test";

export class DashboardShell {
  readonly page: Page;
  readonly breadcrumbDashboardLink: Locator;
  readonly navHomeLink: Locator;
  readonly navListingsLink: Locator;
  readonly navListsLink: Locator;
  readonly navProfileLink: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.breadcrumbDashboardLink = page.getByRole("link", {
      name: "Dashboard",
    });
    this.navHomeLink = page.getByTestId("dashboard-nav-home");
    this.navListingsLink = page.getByTestId("dashboard-nav-listings");
    this.navListsLink = page.getByTestId("dashboard-nav-lists");
    this.navProfileLink = page.getByTestId("dashboard-nav-profile");
    this.refreshButton = page.getByTestId("dashboard-refresh");
  }

  async goToDashboard() {
    // Prefer sidebar navigation so this works even if breadcrumbs are transient
    // (eg during page-level loading states).
    if (await this.navHomeLink.isVisible()) {
      await this.navHomeLink.click();
      return;
    }

    await this.breadcrumbDashboardLink.click();
  }

  async goToListings() {
    await this.navListingsLink.click();
  }

  async goToLists() {
    await this.navListsLink.click();
  }

  async goToProfile() {
    await this.navProfileLink.click();
  }

  async refreshDashboardData() {
    await this.refreshButton.waitFor({ state: "visible" });
    await this.refreshButton.click();
    await expect(this.refreshButton).toHaveAttribute("data-state", "refreshing");
    await expect(this.refreshButton).toHaveAttribute("data-state", "idle");
  }
}
