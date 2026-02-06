import { test as base } from "../../../e2e/test-setup";
import { HomePage } from "../pages/home-page";
import { DashboardHome } from "../pages/dashboard-home";
import { DashboardProfile } from "../pages/dashboard-profile";
import { DashboardListings } from "../pages/dashboard-listings";
import { DashboardLists } from "../pages/dashboard-lists";
import { CreateListingDialog } from "../pages/create-listing-dialog";
import { EditListingDialog } from "../pages/edit-listing-dialog";
import { StripeCheckout } from "../pages/stripe-checkout";
import { ClerkAuthModal } from "../pages/clerk-auth-modal";
import { DashboardShell } from "../pages/dashboard-shell";

export const test = base.extend<{
  homePage: HomePage;
  dashboardHome: DashboardHome;
  dashboardProfile: DashboardProfile;
  dashboardListings: DashboardListings;
  dashboardLists: DashboardLists;
  createListingDialog: CreateListingDialog;
  editListingDialog: EditListingDialog;
  stripeCheckout: StripeCheckout;
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
  createListingDialog: async ({ page }, apply) => {
    await apply(new CreateListingDialog(page));
  },
  editListingDialog: async ({ page }, apply) => {
    await apply(new EditListingDialog(page));
  },
  stripeCheckout: async ({ page }, apply) => {
    await apply(new StripeCheckout(page));
  },
  dashboardShell: async ({ page }, apply) => {
    await apply(new DashboardShell(page));
  },
  clerkAuthModal: async ({ page }, apply) => {
    await apply(new ClerkAuthModal(page));
  },
});

export { expect } from "@playwright/test";
