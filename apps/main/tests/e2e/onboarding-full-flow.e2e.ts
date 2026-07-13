import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail, getClerkUserIdByEmail } from "./utils/clerk";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  type AnonymousOnboardingDraft,
} from "../../src/app/onboarding/anonymous-onboarding-draft";
import { seedOnboardingExampleCultivars } from "../../src/lib/test-utils/seed-onboarding-example-cultivars";

const TEST_CODE = "424242";

async function readBrowserDraft(page: Page) {
  return page.evaluate((storageKey) => {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as AnonymousOnboardingDraft) : null;
  }, ANONYMOUS_ONBOARDING_DRAFT_KEY);
}

async function completeClerkEmailCodeFlow(page: Page, email: string) {
  const clerkPanel = page.getByTestId("checkout-clerk-sign-in");
  const emailInput = clerkPanel.getByLabel(/email/i).first();
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await expect(emailInput).toHaveValue(email);
  await clerkPanel.getByRole("button", { name: /continue/i }).click();

  const signUpLink = clerkPanel.getByRole("link", { name: /sign up/i });
  if (await signUpLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signUpLink.click();
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(email);
    }
    await clerkPanel.getByRole("button", { name: /continue/i }).click();
  }

  const codeInput = page
    .getByRole("textbox", { name: /enter verification code/i })
    .first();
  await expect(codeInput).toBeVisible({ timeout: 15_000 });
  await expect(codeInput).toBeEnabled();
  await codeInput.type(TEST_CODE, { delay: 100 });
}

test.describe("persuasion-first anonymous onboarding @local", () => {
  test("stays stacked on phones and becomes a split enrichment workspace on iPad", async ({
    page,
  }) => {
    await page.goto("/");
    await withTempE2EDb(seedOnboardingExampleCultivars);

    for (const viewport of [
      { width: 390, height: 844, expectedColumns: 1 },
      { width: 820, height: 1180, expectedColumns: 3 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/onboarding");
      await page.getByTestId("onboarding-workflow-document").click();
      await page.getByTestId("onboarding-catalog-size-25_99").click();
      await page.getByTestId("anonymous-onboarding-primary-action").click();
      await page.getByTestId("onboarding-cultivar-search").fill("Primal");
      await page
        .getByRole("button", { name: /add primal scream to your preview/i })
        .click();
      await page.getByTestId("onboarding-cultivar-search").fill("Coffee");
      await page
        .getByRole("button", { name: /add coffee frenzy to your preview/i })
        .click();
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      const split = page.getByTestId("onboarding-enrichment-split");
      await expect(split).toBeVisible();
      const columnCount = await split.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      expect(columnCount).toBe(viewport.expectedColumns);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      await page.evaluate(() => window.localStorage.clear());
    }
  });

  test("turns real cultivar data into a private catalog and imports only the garden name", async ({
    page,
    homePage,
    dashboardHome,
  }, testInfo) => {
    test.slow();

    const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
    const initialEmail = `persuasion-initial+clerk_test_${runId}@example.com`;
    const paidEmail = `persuasion-paid+clerk_test_${runId}@example.com`;
    const profileName = "Persuasion Flow Daylilies";

    await deleteClerkUserByEmail(initialEmail);
    await deleteClerkUserByEmail(paidEmail);
    await withTempE2EDb(seedOnboardingExampleCultivars);

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

      await page.getByTestId("onboarding-workflow-facebook").click();
      await page.getByTestId("onboarding-catalog-size-100_499").click();
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await page.getByTestId("onboarding-cultivar-search").fill("Primal");
      await page
        .getByRole("button", { name: /add primal scream to your preview/i })
        .click();
      await page.getByTestId("onboarding-cultivar-search").fill("Coffee");
      await page
        .getByRole("button", { name: /add coffee frenzy to your preview/i })
        .click();
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await expect(page.getByText("Your collection before")).toBeVisible();
      await expect(page.getByText(/automatically adds/i)).toBeVisible();
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await expect(
        page.getByText(/Private preview · browser only/i),
      ).toBeVisible();
      await page.getByLabel("Price for Primal Scream").fill("32");
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await expect(
        page.getByRole("heading", {
          name: /One listing works wherever buyers find you/i,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Facebook" }).click();
      await expect(page.getByText("DAYLILYCATALOG.COM")).toBeVisible();
      await page.getByRole("tab", { name: "Buyer catalog" }).click();
      await expect(page.getByTestId("advanced-filter-for-sale")).toBeVisible();
      await expect(page.getByTestId("advanced-filter-has-photo")).toBeVisible();
      await page.getByTestId("search-mode-switch").click();
      await page
        .getByRole("button", { name: "Classification & Details" })
        .click();
      await expect(page.getByText("Parentage")).toBeVisible();
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await page.getByTestId("onboarding-personalize-name").fill(profileName);
      await expect(page.getByTestId("onboarding-personalize-name")).toHaveValue(
        profileName,
      );
      await page.getByTestId("anonymous-onboarding-primary-action").click();

      await expect(
        page.getByRole("heading", {
          name: "Save the catalog you just shaped.",
        }),
      ).toBeVisible();

      const draft = await readBrowserDraft(page);
      expect(draft).toMatchObject({
        version: 2,
        workflow: "facebook",
        catalogSize: "100_499",
        collection: [
          expect.objectContaining({ name: "Primal Scream", price: 32 }),
          expect.objectContaining({ name: "Coffee Frenzy" }),
        ],
        profile: { gardenName: profileName },
      });
      expect(draft?.ahaReachedAt).toBeTruthy();

      await page.getByTestId("anonymous-onboarding-email").fill(initialEmail);
      await page.getByTestId("anonymous-onboarding-email-submit").click();
      await expect(
        page.getByRole("heading", {
          name: "Publish when you are ready to start your trial",
        }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText(/sample listings do not import/i),
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
      await completeClerkEmailCodeFlow(page, paidEmail);

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
      await dashboardHome.waitForLoaded();
      const clerkUserId = await getClerkUserIdByEmail(paidEmail);
      expect(clerkUserId).toBeTruthy();

      const dbState = await withTempE2EDb(
        async (db) => {
          const user = await db.user.findUniqueOrThrow({
            where: { clerkUserId: clerkUserId! },
            include: { profile: true, listings: true },
          });
          return {
            stripeCustomerId: user.stripeCustomerId,
            profile: user.profile,
            listingCount: user.listings.length,
          };
        },
        { clearFirst: false },
      );

      expect(dbState.stripeCustomerId).toMatch(/^cus_e2e_/);
      expect(dbState.profile?.title).toBe(profileName);
      expect(dbState.profile?.location).toBeNull();
      expect(dbState.profile?.description).toBeNull();
      expect(dbState.listingCount).toBe(0);
    } finally {
      await deleteClerkUserByEmail(initialEmail);
      await deleteClerkUserByEmail(paidEmail);
    }
  });
});
