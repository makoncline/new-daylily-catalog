import { expect, test as base } from "@playwright/test";
import { CreateListingDialog } from "../e2e/pages/create-listing-dialog";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";

export const test = base.extend<{
  createListingDialog: CreateListingDialog;
  dashboardListings: DashboardListings;
  editListingDialog: EditListingDialog;
}>({
  page: async ({ page, baseURL }, use) => {
    if (!baseURL) throw new Error("Integration baseURL is required.");
    const appOrigin = new URL(baseURL).origin;
    const blockedRequests: string[] = [];

    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      const url = new URL(requestUrl);
      if (
        url.origin === appOrigin ||
        url.protocol === "data:" ||
        url.protocol === "blob:"
      ) {
        await route.continue();
        return;
      }

      blockedRequests.push(requestUrl);
      await route.abort("blockedbyclient");
    });

    await use(page);
    expect(blockedRequests, "blocked outbound browser requests").toEqual([]);
  },
  createListingDialog: async ({ page }, use) => {
    await use(new CreateListingDialog(page));
  },
  dashboardListings: async ({ page }, use) => {
    await use(new DashboardListings(page));
  },
  editListingDialog: async ({ page }, use) => {
    await use(new EditListingDialog(page));
  },
});

export { expect };
