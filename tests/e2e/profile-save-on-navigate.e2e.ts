import { clerk } from "@clerk/testing/playwright";
import { test, expect } from "./fixtures/app-fixtures";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  TEST_USER,
  createAuthedUser,
} from "../../src/lib/test-utils/e2e-users";
import { setStripeSubscriptionStatus } from "./utils/stripe";

test.describe("profile save on navigate @local", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);
      await setStripeSubscriptionStatus({
        db,
        stripeCustomerId: TEST_USER.stripeCustomerId,
      });

      const profile = await db.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          slug: user.id,
        },
      });

      await db.image.create({
        data: {
          url: "/assets/bouquet.png",
          userProfileId: profile.id,
          order: 0,
        },
      });
    });
  });

  test("garden name is visible immediately after navigate-away autosave", async ({
    page,
    dashboardProfile,
    dashboardShell,
  }) => {
    const updatedGardenName = `Navigate Save ${Date.now()}`;
    const saveToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Changes saved" })
      .first();

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    await dashboardProfile.fillGardenName(updatedGardenName);

    await dashboardShell.goToListings();
    await expect(page).toHaveURL(/\/dashboard\/listings/);
    await expect(saveToast).toBeVisible();

    await dashboardShell.goToProfile();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await dashboardProfile.isReady();

    await expect(dashboardProfile.gardenNameInput).toHaveValue(
      updatedGardenName,
    );
  });

  test("slug warning gates edit and slug saves on navigate-away autosave", async ({
    page,
    dashboardProfile,
    dashboardShell,
  }) => {
    const updatedSlug = `profile-${Date.now()}`;
    const slugInput = page.locator('input[name="slug"]');
    const saveToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Changes saved" })
      .first();

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    const slugWarningDialog = page.getByRole("alertdialog");

    await slugInput.click();
    await expect(
      slugWarningDialog.getByRole("heading", {
        name: "Before You Edit Your URL",
      }),
    ).toBeVisible();
    await slugWarningDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(slugWarningDialog).not.toBeVisible();
    await expect(slugInput).not.toBeFocused();

    await slugInput.click();
    await expect(
      slugWarningDialog.getByRole("heading", {
        name: "Before You Edit Your URL",
      }),
    ).toBeVisible();
    await slugWarningDialog.getByRole("button", { name: "Continue" }).click();
    await expect(slugWarningDialog).not.toBeVisible();
    await expect(slugInput).toBeFocused();

    await slugInput.fill(updatedSlug);

    await dashboardShell.goToListings();
    await expect(page).toHaveURL(/\/dashboard\/listings/);
    await expect(saveToast).toBeVisible();

    await dashboardShell.goToProfile();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await dashboardProfile.isReady();
    await expect(slugInput).toHaveValue(updatedSlug);

    await page.reload();
    await dashboardProfile.isReady();
    await expect(slugInput).toHaveValue(updatedSlug);
  });

  test("content is visible immediately after navigate-away autosave", async ({
    page,
    dashboardProfile,
    dashboardShell,
  }) => {
    const updatedContent = `Navigate content ${Date.now()}`;

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    await dashboardProfile.fillContent(updatedContent);

    await dashboardShell.goToListings();
    await expect(page).toHaveURL(/\/dashboard\/listings/);

    await dashboardShell.goToProfile();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await dashboardProfile.isReady();

    await expect(dashboardProfile.contentEditor).toContainText(updatedContent);
  });

  test("profile image changes are visible immediately after navigation", async ({
    page,
    dashboardProfile,
    dashboardShell,
  }) => {
    const imageDeletedToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Image deleted successfully" })
      .first();

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    await expect(page.getByTestId("image-item").first()).toBeVisible();
    await page.getByTestId("image-delete-button").first().click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(imageDeletedToast).toBeVisible();
    await expect(page.getByTestId("image-item")).toHaveCount(0);

    await dashboardShell.goToListings();
    await expect(page).toHaveURL(/\/dashboard\/listings/);

    await dashboardShell.goToProfile();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await dashboardProfile.isReady();

    await expect(page.getByTestId("image-item")).toHaveCount(0);
  });
});
