import type { Locator, Page } from "@playwright/test";

export class DashboardShell {
  readonly page: Page;
  readonly breadcrumbDashboardLink: Locator;
  readonly navHomeLink: Locator;
  readonly navListingsLink: Locator;
  readonly navListsLink: Locator;
  readonly navProfileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.breadcrumbDashboardLink = page.getByRole("link", {
      name: "Dashboard",
    });
    this.navHomeLink = page.getByTestId("dashboard-nav-home");
    this.navListingsLink = page.getByTestId("dashboard-nav-listings");
    this.navListsLink = page.getByTestId("dashboard-nav-lists");
    this.navProfileLink = page.getByTestId("dashboard-nav-profile");
  }

  async goToDashboard() {
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
}
