import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail } from "./utils/clerk";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { getClerkUserIdByEmail } from "./utils/db";

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
    dashboardProfile,
    clerkAuthModal,
  }) => {
    await withTempE2EDb(async (db) => {
      await homePage.goto();
      await homePage.isReady();

      await homePage.openDashboard();
      await clerkAuthModal.signUpWithEmail(TEST_EMAIL, TEST_CODE);

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await dashboardHome.waitForLoaded();

      const profilePercentage =
        await dashboardHome.getProfileCompletionPercentage();
      expect(profilePercentage).toBe(0);

      const catalogPercentage =
        await dashboardHome.getCatalogProgressPercentage();
      expect(catalogPercentage).toBe(0);

      await expect(dashboardHome.upgradeToProButton).toBeVisible();

      await dashboardHome.completeProfileButton.click();
      await expect(page).toHaveURL(/\/dashboard\/profile/, { timeout: 10000 });
      await dashboardProfile.isReady();

      const testImageUrl = "/assets/bouquet.png";
      const testDescription = "Test garden description for e2e testing";
      const testLocation = "Test Location, State";
      const testContent = "This is test content for the profile.";

      const clerkUserId = await getClerkUserIdByEmail(TEST_EMAIL);
      if (!clerkUserId) {
        throw new Error("Clerk user not found");
      }

      await dashboardProfile.fillDescription(testDescription);
      await dashboardProfile.fillLocation(testLocation);
      await dashboardProfile.fillContent(testContent);

      const user = await db.user.findUnique({
        where: { clerkUserId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const profile = await db.userProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      await db.image.create({
        data: {
          url: testImageUrl,
          userProfileId: profile.id,
          order: 0,
        },
      });

      await page.reload();
      await dashboardProfile.isReady();

      await expect(dashboardProfile.descriptionInput).toHaveValue(
        testDescription,
      );
      await expect(dashboardProfile.locationInput).toHaveValue(testLocation);
      await expect(dashboardProfile.contentEditor).toContainText(testContent);
      await expect(dashboardProfile.profileImage).toBeVisible();
      await page.pause();
    });
  });
});
