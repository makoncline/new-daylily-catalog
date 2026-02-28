import { test, expect } from "./fixtures/app-fixtures";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { deleteClerkUserByEmail } from "./utils/clerk";
import { seedAhsListing } from "./utils/ahs-listings";

const TEST_EMAIL = "onboarding-full+clerk_test@gmail.com";
const TEST_CODE = "424242";

async function seedOnboardingCultivars() {
  if (process.env.BASE_URL) {
    return;
  }

  await withTempE2EDb(async (db) => {
    const cultivars = [
      {
        name: "Coffee Frenzy",
        hybridizer: "Reed",
        year: "2012",
        ahsImageUrl: "/assets/hero-garden.webp",
      },
      {
        name: "Stella de Oro",
        hybridizer: "Jablonski",
        year: "1975",
        ahsImageUrl: "/assets/aerial-garden.webp",
      },
      {
        name: "Happy Returns",
        hybridizer: "Apps",
        year: "1991",
        ahsImageUrl: "/assets/catalog-blooms.webp",
      },
      {
        name: "Chicago Apache",
        hybridizer: "Marsh",
        year: "1981",
        ahsImageUrl: "/assets/cultivar-grid.webp",
      },
    ] as const;

    for (const cultivar of cultivars) {
      const { ahsListing } = await seedAhsListing({
        db,
        name: cultivar.name,
        hybridizer: cultivar.hybridizer,
        year: cultivar.year,
      });

      await db.ahsListing.update({
        where: { id: ahsListing.id },
        data: {
          ahsImageUrl: cultivar.ahsImageUrl,
        },
      });
    }
  });
}

test.describe("onboarding full flow @local", () => {
  test("completes onboarding to checkout, then success page, then dashboard", async ({
    page,
    homePage,
    clerkAuthModal,
    onboardingFlowPage,
    stripeCheckout,
    subscribeSuccessPage,
    dashboardHome,
  }) => {
    await deleteClerkUserByEmail(TEST_EMAIL);

    try {
      await seedOnboardingCultivars();

      await homePage.goto();
      await homePage.isReady();
      await page
        .getByRole("button", { name: "Create your catalog" })
        .first()
        .click();

      await clerkAuthModal.signUpWithEmail(TEST_EMAIL, TEST_CODE);
      await expect(page).toHaveURL(/\/onboarding/);
      await onboardingFlowPage.waitForLoaded();
      await onboardingFlowPage.waitForProfileReady();

      await onboardingFlowPage.expectStep(1, "Build your catalog card");
      await onboardingFlowPage.fillProfileStep({
        sellerName: "Sunrise Daylily Farm",
        location: "Snohomish, WA",
        description:
          "Family-grown daylilies with seasonal shipping and collector-focused descriptions.",
      });
      await onboardingFlowPage.clickPrimaryAction();

      await onboardingFlowPage.expectStep(2, "See it on catalogs");
      await onboardingFlowPage.expectProfilePreview({
        sellerName: "Sunrise Daylily Farm",
        location: "Snohomish, WA",
        description:
          "Family-grown daylilies with seasonal shipping and collector-focused descriptions.",
      });
      await onboardingFlowPage.clickPrimaryAction();

      await onboardingFlowPage.expectStep(3, "Build your first listing");
      await onboardingFlowPage.expectDefaultCultivarLinked("Coffee Frenzy");
      await onboardingFlowPage.expectListingPreviewUsesLinkedImage();
      await onboardingFlowPage.fillListingStep({
        title: "Coffee Frenzy spring fan",
        price: "25",
        description: "Healthy spring fan with strong roots and bright rebloom potential.",
      });
      await onboardingFlowPage.expectListingPreview({
        title: "Coffee Frenzy spring fan",
        price: "25",
        description: "Healthy spring fan with strong roots and bright rebloom potential.",
      });
      await onboardingFlowPage.clickPrimaryAction();

      await onboardingFlowPage.expectStep(4, "See your listing card");
      await expect(
        page.getByText("Coffee Frenzy spring fan", { exact: false }),
      ).toBeVisible();
      await onboardingFlowPage.clickPrimaryAction();

      await onboardingFlowPage.expectStep(5, "See buyer inquiry flow");
      await onboardingFlowPage.expectBuyerContactStep();
      await onboardingFlowPage.clickPrimaryAction();

      await onboardingFlowPage.expectStep(6, "Get started");
      await onboardingFlowPage.expectMembershipStep();
      await onboardingFlowPage.checkoutButton.click();
      await stripeCheckout.isReady();

      // Stripe checkout is external. Navigate back to local success page to continue.
      await page.goto("/subscribe/success");
      await subscribeSuccessPage.isReady();
      await subscribeSuccessPage.dashboardLink.click();

      await expect(page).toHaveURL(/\/dashboard/);
      await dashboardHome.waitForLoaded();
    } finally {
      await deleteClerkUserByEmail(TEST_EMAIL);
    }
  });
});
