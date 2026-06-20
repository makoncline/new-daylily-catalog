import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail, getClerkUserIdByEmail } from "./utils/clerk";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  type AnonymousOnboardingDraft,
} from "../../src/app/onboarding/anonymous-onboarding-draft";

const TEST_CODE = "424242";
const PROFILE_IMAGE_PATH = "public/assets/home-redesign/grower-garden.webp";
const LISTING_IMAGE_PATH = "public/assets/catalog-blooms.webp";

const appRoot = process.cwd();

async function readBrowserDraft(page: Page) {
  return page.evaluate((storageKey) => {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as AnonymousOnboardingDraft) : null;
  }, ANONYMOUS_ONBOARDING_DRAFT_KEY);
}

test.describe("anonymous onboarding checkout flow @local", () => {
  test("starts on the home page and reaches the paid dashboard", async ({
    page,
    homePage,
    clerkAuthModal,
    dashboardHome,
  }, testInfo) => {
    test.slow();

    const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
    const initialEmail = `anonymous-initial+clerk_test_${runId}@example.com`;
    const paidEmail = `anonymous-paid+clerk_test_${runId}@example.com`;
    const profileName = "Anonymous Flow Daylilies";
    const profileLocation = "Olympia, WA";
    const profileDescription =
      "Small grower catalog focused on clear photos and seasonal availability.";
    const listingTitle = "Happy Returns starter clump";
    const listingDescription =
      "Bright repeat-blooming example listing with clean roots and simple notes.";

    await deleteClerkUserByEmail(initialEmail);
    await deleteClerkUserByEmail(paidEmail);
    await withTempE2EDb(async () => undefined);

    try {
      await homePage.goto();
      await homePage.isReady();

      await page
        .getByRole("link", { name: "Create your catalog" })
        .first()
        .click();
      await expect(page).toHaveURL(/\/start-membership/);
      await page.getByTestId("start-membership-checkout").first().click();
      await expect(page).toHaveURL(/\/onboarding/);
      await expect(page.getByTestId("anonymous-onboarding-page")).toBeVisible();

      await page.getByTestId("anonymous-onboarding-email").fill(initialEmail);
      await page.getByTestId("anonymous-onboarding-email-submit").click();
      await expect(
        page.getByRole("heading", { name: "Edit your profile" }),
      ).toBeVisible();

      await page.getByTestId("anonymous-profile-name").fill(profileName);
      await page
        .getByTestId("anonymous-profile-image")
        .setInputFiles(path.join(appRoot, PROFILE_IMAGE_PATH));
      await expect
        .poll(async () => {
          const draft = await readBrowserDraft(page);
          return draft?.profile.profileImageDataUrl?.startsWith("data:image/");
        })
        .toBe(true);
      await page
        .getByTestId("anonymous-profile-location")
        .fill(profileLocation);
      await page
        .getByTestId("anonymous-profile-description")
        .fill(profileDescription);

      await page.getByTestId("anonymous-onboarding-primary-action").click();
      await expect(
        page.getByRole("heading", { name: "Edit your first listing" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Happy Returns" }).click();
      await page.getByTestId("anonymous-listing-title").fill(listingTitle);
      await page.getByTestId("anonymous-listing-price").fill("18");
      await page
        .getByTestId("anonymous-listing-description")
        .fill(listingDescription);
      await page
        .getByTestId("anonymous-listing-image")
        .setInputFiles(path.join(appRoot, LISTING_IMAGE_PATH));
      await expect
        .poll(async () => {
          const draft = await readBrowserDraft(page);
          return draft?.listingPreview.imageDataUrl?.startsWith("data:image/");
        })
        .toBe(true);

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Edit your first listing" }),
      ).toBeVisible();
      await expect(page.getByTestId("anonymous-listing-title")).toHaveValue(
        listingTitle,
      );

      await page.getByTestId("anonymous-onboarding-primary-action").click();
      await expect(
        page.getByText(
          "Path 1: Buyer opens your catalog and sends an email immediately.",
        ),
      ).toBeVisible();
      await page.getByTestId("anonymous-onboarding-primary-action").click();
      await expect(
        page.getByRole("heading", { name: "Confirm your account email" }),
      ).toBeVisible();

      await page.getByRole("button", { name: /Edit email/i }).click();
      await page.getByTestId("anonymous-checkout-email").fill(paidEmail);
      await page.getByTestId("anonymous-checkout-email-save").click();
      await expect(
        page.getByTestId("anonymous-checkout-email-value"),
      ).toHaveText(paidEmail);

      await page.getByTestId("anonymous-onboarding-checkout").click();
      await expect(page).toHaveURL(
        /\/onboarding\/checkout\/success\?session_id=cs_test_onboarding_/,
        { timeout: 45_000 },
      );
      await expect(page.getByTestId("checkout-paid-email")).toHaveText(
        paidEmail,
      );

      await page.getByTestId("checkout-create-account").click();
      await clerkAuthModal.signUpWithEmail(paidEmail, TEST_CODE);

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
      await dashboardHome.waitForLoaded();

      const clerkUserId = await getClerkUserIdByEmail(paidEmail);
      expect(clerkUserId).toBeTruthy();

      const dbState = await withTempE2EDb(
        async (db) => {
          const user = await db.user.findUniqueOrThrow({
            where: { clerkUserId: clerkUserId! },
            include: {
              profile: { include: { images: true } },
              listings: true,
            },
          });
          const subscriptionCache = await db.keyValue.findFirst({
            where: {
              key: { startsWith: `stripe:customer:${user.stripeCustomerId}` },
            },
          });

          return {
            stripeCustomerId: user.stripeCustomerId,
            profile: user.profile,
            listingCount: user.listings.length,
            profileImageStatus: user.profile?.images[0]?.status ?? null,
            subscriptionCache: subscriptionCache?.value ?? null,
          };
        },
        { clearFirst: false },
      );

      expect(dbState.stripeCustomerId).toMatch(/^cus_e2e_/);
      expect(dbState.profile?.title).toBe(profileName);
      expect(dbState.profile?.location).toBe(profileLocation);
      expect(dbState.profile?.description).toBe(profileDescription);
      expect(dbState.profile?.images).toHaveLength(1);
      expect(dbState.profileImageStatus).toBe("onboarding-import-local-e2e");
      expect(dbState.listingCount).toBe(0);
      expect(dbState.subscriptionCache).toContain('"status":"trialing"');
    } finally {
      await deleteClerkUserByEmail(initialEmail);
      await deleteClerkUserByEmail(paidEmail);
    }
  });
});
