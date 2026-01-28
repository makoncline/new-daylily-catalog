import { test as base } from "../../../e2e/test-setup";
import { HomePage } from "../pages/home-page";
import { DashboardHome } from "../pages/dashboard-home";
import { ClerkAuthModal } from "../pages/clerk-auth-modal";

export const test = base.extend<{
  homePage: HomePage;
  dashboardHome: DashboardHome;
  clerkAuthModal: ClerkAuthModal;
}>({
  homePage: async ({ page }, apply) => {
    await apply(new HomePage(page));
  },
  dashboardHome: async ({ page }, apply) => {
    await apply(new DashboardHome(page));
  },
  clerkAuthModal: async ({ page }, apply) => {
    await apply(new ClerkAuthModal(page));
  },
});

export { expect } from "@playwright/test";
