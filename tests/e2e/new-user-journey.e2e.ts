import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail, getClerkUserIdByEmail } from "./utils/clerk";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { addProfileImageForUser } from "./utils/images";

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
    dashboardShell,
    clerkAuthModal,
  }) => {
    await withTempE2EDb(async (db) => {
      // arrive on the home page
      await homePage.goto();
      await homePage.isReady();

      // sign up
      await homePage.openDashboard();
      await clerkAuthModal.signUpWithEmail(TEST_EMAIL, TEST_CODE);

      // redirect to the dashboard after sign up
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await dashboardHome.waitForLoaded();

      // check the profile completion percentage
      const profilePercentage =
        await dashboardHome.getProfileCompletionPercentage();
      expect(profilePercentage).toBe(0);

      // // todo: move this to later after we finish profile onboarding

      // await expect(dashboardHome.upgradeToProButton).toBeVisible();

      // go to the profile page
      await dashboardHome.completeProfileButton.click();
      await expect(page).toHaveURL(/\/dashboard\/profile/, { timeout: 10000 });
      await dashboardProfile.isReady();

      // fill in the profile fields
      const testImageUrl = "/assets/bouquet.png";
      const testGardenName = "Test Garden";
      const testDescription = "Test garden description for e2e testing";
      const testLocation = "Test Location, State";
      const testContent = "This is test content for the profile.";

      await dashboardProfile.fillGardenName(testGardenName);
      await dashboardProfile.fillDescription(testDescription);
      await dashboardProfile.fillLocation(testLocation);
      await dashboardProfile.fillContent(testContent);

      // add a profile image. too hard to mock so we just add it to the database directly
      const clerkUserId = await getClerkUserIdByEmail(TEST_EMAIL);
      if (!clerkUserId) {
        throw new Error("Clerk user not found");
      }
      await addProfileImageForUser({
        db,
        clerkUserId,
        imageUrl: testImageUrl,
      });

      // reload the page and check changes persist
      await page.reload();
      await dashboardProfile.isReady();

      await expect(dashboardProfile.gardenNameInput).toHaveValue(
        testGardenName,
      );
      await expect(dashboardProfile.descriptionInput).toHaveValue(
        testDescription,
      );
      await expect(dashboardProfile.locationInput).toHaveValue(testLocation);
      await expect(dashboardProfile.contentEditor).toContainText(testContent);
      await expect(dashboardProfile.profileImage).toBeVisible();

      // Navigate back to dashboard via breadcrumbs
      await dashboardShell.goToDashboard();
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
      await dashboardHome.waitForLoaded();

      // Assert that "Complete Your Profile" card is no longer shown once profile is complete
      await expect(dashboardHome.completeProfileCard).not.toBeVisible();

      // we work on the listings onboarding next
      const catalogPercentage =
        await dashboardHome.getCatalogProgressPercentage();
      expect(catalogPercentage).toBe(0);
    });
  });
});
