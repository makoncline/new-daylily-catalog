import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail, getClerkUserIdByEmail } from "./utils/clerk";
import { setStripeSubscriptionStatus } from "./utils/stripe";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { addProfileImageForUser, addListingImage } from "./utils/images";
import { seedAhsListing } from "./utils/ahs-listings";
import { createListing } from "./utils/listings";

const TEST_EMAIL_PREFIX = "newuser+clerk_test";
const TEST_CODE = "424242";

test.describe("new user journey @local", () => {
  test("new user can sign up through dashboard button", async ({
    page,
    homePage,
    dashboardHome,
    dashboardProfile,
    dashboardListings,
    createListingDialog,
    editListingDialog,
    stripeCheckout,
    dashboardShell,
    clerkAuthModal,
  }, testInfo) => {
    test.slow();
    const testEmail = `${TEST_EMAIL_PREFIX}+${Date.now()}-${testInfo.repeatEachIndex}@gmail.com`;

    try {
      await withTempE2EDb(async (db) => {
        // Phase 1: auth and profile completion
        // arrive on the home page
        await homePage.goto();
        await homePage.isReady();

        // sign up
        await homePage.openDashboard();
        await clerkAuthModal.signUpWithEmail(testEmail, TEST_CODE);

        // redirect to the dashboard after sign up
        await dashboardHome.waitForLoaded();
        await expect(page).toHaveURL(/\/dashboard/);

        // check the profile completion percentage
        const profilePercentage =
          await dashboardHome.getProfileCompletionPercentage();
        expect(profilePercentage).toBe(0);

        // go to the profile page
        await dashboardHome.completeProfileButton.click();
        await expect(page).toHaveURL(/\/dashboard\/profile/);
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
        const clerkUserId = await getClerkUserIdByEmail(testEmail);
        if (!clerkUserId) {
          throw new Error("Clerk user not found");
        }
        await addProfileImageForUser({
          db,
          clerkUserId,
          imageUrl: testImageUrl,
        });

        // refresh to pick up the profile image inserted directly in the database
        await dashboardShell.refreshDashboardData();
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
        await expect(page).toHaveURL(/\/dashboard$/);
        await dashboardHome.waitForLoaded();

        // Assert that "Complete Your Profile" card is no longer shown once profile is complete
        await expect(dashboardHome.completeProfileCard).not.toBeVisible();

        // Phase 2: listing onboarding completion
        // we work on the listings onboarding next
        const catalogPercentage =
          await dashboardHome.getCatalogProgressPercentage();
        expect(catalogPercentage).toBe(0);

        // click the "Manage Listings" button on the catalog progress card
        await dashboardHome.manageListingsButton.click();
        await expect(page).toHaveURL(/\/dashboard\/listings/);
        await dashboardListings.isReady();

        // seed some AHS listings for testing
        const ahsListingsToSeed = [
          { name: "Stella de Oro", hybridizer: "Jablonski", year: "1975" },
          { name: "Happy Returns", hybridizer: "Apps", year: "1991" },
          { name: "Pardon Me", hybridizer: "Moldovan", year: "1989" },
        ] as const;
        for (const ahsListing of ahsListingsToSeed) {
          await seedAhsListing({ db, ...ahsListing });
        }

        // click the create listing button
        await dashboardListings.createListingButton.click();
        await createListingDialog.isReady();

        // search for and select an AHS listing
        // Search for partial name "Stella" to find "Stella de Oro"
        await createListingDialog.searchAndSelectAhsListing(
          "Stella",
          "Stella de Oro",
        );

        await expect(createListingDialog.titleInput).toHaveValue(
          "Stella de Oro",
        );
        await expect(createListingDialog.createButton).toBeEnabled();

        // change the listing title to something else
        const customTitle = "My Custom Daylily Title";
        await createListingDialog.changeTitle(customTitle);

        // create the listing
        await createListingDialog.createListing();

        // wait for the edit listing dialog to open
        await editListingDialog.isReady();
        await expect(page).toHaveURL(
          (url) => url.searchParams.get("editing") !== null,
        );

        // get the listing ID from the URL query param
        const listingId = await editListingDialog.getListingIdFromUrl();
        if (!listingId) {
          throw new Error("Listing ID not found in URL");
        }

        // create a list by typing the name and clicking create
        const testListName = "My Test List";
        await editListingDialog.createList(testListName);
        await expect(
          editListingDialog.selectedListChip(testListName),
        ).toBeVisible();
        await expect(
          page
            .locator("[data-sonner-toast]")
            .filter({ hasText: "Lists updated" })
            .first(),
        ).toBeVisible();

        // programmatically add an image to the listing
        const testListingImageUrl = "/assets/bouquet.png";
        await addListingImage({
          db,
          listingId,
          imageUrl: testListingImageUrl,
        });

        // refresh to pick up the listing image inserted directly in the database
        await editListingDialog.close();
        await dashboardShell.refreshDashboardData();
        await dashboardListings.isReady();
        await dashboardListings.chooseRowActionEdit();
        await editListingDialog.isReady();

        // fill the other fields
        const listingDescription = "This is a test description for the listing";
        const listingPrice = 25;
        const listingPrivateNote = "This is a private note for testing";
        await editListingDialog.fillDescription(listingDescription);
        await editListingDialog.fillPrice(listingPrice);
        await editListingDialog.fillPrivateNote(listingPrivateNote);
        await editListingDialog.setStatusToHidden();

        // check the name is what we set on creation
        const currentTitle = await editListingDialog.getTitle();
        expect(currentTitle).toBe(customTitle);

        // press the sync name button
        await editListingDialog.syncName();

        // check that the name matches the linked listing after sync
        await expect(editListingDialog.titleInput).toHaveValue("Stella de Oro");

        // close the dialog
        await editListingDialog.close();

        // programmatically add 2 more listings with different names
        // Get the user ID first (reuse the clerkUserId from earlier)
        const user = await db.user.findUnique({
          where: { clerkUserId },
        });
        if (!user) {
          throw new Error("User not found");
        }

        const additionalListings = [
          {
            title: "Beautiful Daylily",
            description: "A beautiful daylily for testing",
            price: 30,
            privateNote: "Private note for listing 2",
          },
          {
            title: "Garden Favorite",
            description: "Another test daylily",
            price: 20,
            privateNote: "Private note for listing 3",
          },
        ] as const;
        for (const listing of additionalListings) {
          await createListing({
            db,
            userId: user.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            privateNote: listing.privateNote,
          });
        }

        // refresh to pick up the new listings inserted directly in the database
        await dashboardShell.refreshDashboardData();
        await dashboardListings.isReady();

        // check for them in the listings table
        await expect(
          dashboardListings.listingRow("Beautiful Daylily"),
        ).toBeVisible();
        await expect(
          dashboardListings.listingRow("Garden Favorite"),
        ).toBeVisible();

        // navigate back to dashboard home
        await dashboardShell.goToDashboard();
        await expect(page).toHaveURL(/\/dashboard$/);
        await dashboardHome.waitForLoaded();

        // confirm that the catalog progress card is no longer present
        await expect(dashboardHome.catalogProgressCard).not.toBeVisible();

        // check for the Become a Daylily Catalog Pro card
        await expect(dashboardHome.proMembershipCard).toBeVisible();

        // Phase 3: become pro flow
        // press upgrade to pro button
        await expect(dashboardHome.upgradeToProButton).toBeVisible();
        await dashboardHome.upgradeToProButton.click();

        // Verify we landed on Stripe checkout
        await stripeCheckout.isReady();

        // Programmatically simulate the user having a subscription
        const stripeUser = await db.user.findUnique({
          where: { clerkUserId },
          select: { stripeCustomerId: true },
        });

        if (!stripeUser?.stripeCustomerId) {
          throw new Error("Stripe customer ID not found");
        }

        await setStripeSubscriptionStatus({
          db,
          stripeCustomerId: stripeUser.stripeCustomerId,
          status: "active",
        });

        // Navigate back to dashboard (simulating successful checkout)
        // Note: Stripe checkout is an external page, so this must be a full navigation.
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/dashboard/);

        await dashboardHome.waitForLoaded();

        // Assert the Become a Pro card is no longer shown now that we have a subscription
        await expect(dashboardHome.proMembershipCard).not.toBeVisible();
      });
    } finally {
      await deleteClerkUserByEmail(testEmail);
    }
  });
});
