import { test as base } from "../../../e2e/test-setup";
import { HomePage } from "../pages/home-page";
import { DashboardHome } from "../pages/dashboard-home";
import { DashboardProfile } from "../pages/dashboard-profile";
import { ClerkAuthModal } from "../pages/clerk-auth-modal";

export const test = base.extend<{
  homePage: HomePage;
  dashboardHome: DashboardHome;
  dashboardProfile: DashboardProfile;
  clerkAuthModal: ClerkAuthModal;
}>({
  homePage: async ({ page }, apply) => {
    await apply(new HomePage(page));
  },
  dashboardHome: async ({ page }, apply) => {
    await apply(new DashboardHome(page));
  },
  dashboardProfile: async ({ page }, apply) => {
    await apply(new DashboardProfile(page));
  },
  clerkAuthModal: async ({ page }, apply) => {
    await apply(new ClerkAuthModal(page));
  },
});

export { expect } from "@playwright/test";
