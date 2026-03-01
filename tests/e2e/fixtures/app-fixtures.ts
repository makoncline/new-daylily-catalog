import { test as base } from "../../../e2e/test-setup";
import { HomePage } from "../pages/home-page";
import { DashboardHome } from "../pages/dashboard-home";
import { DashboardProfile } from "../pages/dashboard-profile";
import { DashboardListings } from "../pages/dashboard-listings";
import { DashboardLists } from "../pages/dashboard-lists";
import { ManageListPage } from "../pages/manage-list-page";
import { CreateListingDialog } from "../pages/create-listing-dialog";
import { EditListingDialog } from "../pages/edit-listing-dialog";
import { StripeCheckout } from "../pages/stripe-checkout";
import { ClerkAuthModal } from "../pages/clerk-auth-modal";
import { DashboardShell } from "../pages/dashboard-shell";
import { ImageManager } from "../pages/image-manager";
import { StartMembershipPage } from "../pages/start-membership-page";
import { StartOnboardingPage } from "../pages/start-onboarding-page";
import { OnboardingFlowPage } from "../pages/onboarding-flow-page";

export const test = base.extend<{
  homePage: HomePage;
  dashboardHome: DashboardHome;
  dashboardProfile: DashboardProfile;
  dashboardListings: DashboardListings;
  dashboardLists: DashboardLists;
  manageListPage: ManageListPage;
  createListingDialog: CreateListingDialog;
  editListingDialog: EditListingDialog;
  imageManager: ImageManager;
  stripeCheckout: StripeCheckout;
  startMembershipPage: StartMembershipPage;
  startOnboardingPage: StartOnboardingPage;
  onboardingFlowPage: OnboardingFlowPage;
  dashboardShell: DashboardShell;
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
  dashboardListings: async ({ page }, apply) => {
    await apply(new DashboardListings(page));
  },
  dashboardLists: async ({ page }, apply) => {
    await apply(new DashboardLists(page));
  },
  manageListPage: async ({ page }, apply) => {
    await apply(new ManageListPage(page));
  },
  createListingDialog: async ({ page }, apply) => {
    await apply(new CreateListingDialog(page));
  },
  editListingDialog: async ({ page }, apply) => {
    await apply(new EditListingDialog(page));
  },
  imageManager: async ({ page }, apply) => {
    await apply(new ImageManager(page));
  },
  stripeCheckout: async ({ page }, apply) => {
    await apply(new StripeCheckout(page));
  },
  startMembershipPage: async ({ page }, apply) => {
    await apply(new StartMembershipPage(page));
  },
  startOnboardingPage: async ({ page }, apply) => {
    await apply(new StartOnboardingPage(page));
  },
  onboardingFlowPage: async ({ page }, apply) => {
    await apply(new OnboardingFlowPage(page));
  },
  dashboardShell: async ({ page }, apply) => {
    await apply(new DashboardShell(page));
  },
  clerkAuthModal: async ({ page }, apply) => {
    await apply(new ClerkAuthModal(page));
  },
});

export { expect } from "@playwright/test";
