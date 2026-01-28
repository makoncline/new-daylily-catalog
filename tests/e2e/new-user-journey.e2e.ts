import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail } from "./utils/clerk";

const TEST_EMAIL = "newuser+clerk_test@gmail.com";
const TEST_CODE = "424242";

test.describe("new user journey @local", () => {
  test.beforeAll(async () => {
    await deleteClerkUserByEmail(TEST_EMAIL);
  });
  test.afterAll(async () => {
    await deleteClerkUserByEmail(TEST_EMAIL);
  });

  test("new user can sign up through dashboard button", async ({
    page,
    homePage,
    dashboardHome,
    clerkAuthModal,
  }) => {
    await homePage.goto();
    await homePage.isReady();

    await homePage.openDashboard();
    await clerkAuthModal.signUpWithEmail(TEST_EMAIL, TEST_CODE);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await dashboardHome.waitForLoaded();

    // Verify profile completion is at 0%
    const profilePercentage =
      await dashboardHome.getProfileCompletionPercentage();
    expect(profilePercentage).toBe(0);

    // Verify catalog progress is at 0%
    const catalogPercentage =
      await dashboardHome.getCatalogProgressPercentage();
    expect(catalogPercentage).toBe(0);

    // Verify "Upgrade to Pro" button is visible
    await expect(dashboardHome.upgradeToProButton).toBeVisible();
    await page.pause();
  });
});
