import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/app-fixtures";
import { deleteClerkUserByEmail, getClerkUserIdByEmail } from "./utils/clerk";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { SUBSCRIPTION_CONFIG } from "../../src/config/subscription-config";
import { mockCultivarMatches } from "./utils/catalog-importer";

const TEST_CODE = "424242";
const MATCHED_SAMPLE_CULTIVAR_NAMES = [
  "Stella de Oro",
  "Happy Returns",
  "Ruby Spider",
  "Primal Scream",
  "Orange Velvet",
  "Action Figure",
  "My Favorite Martian",
  "Aerial Art",
] as const;
const MATCHED_SAMPLE_CULTIVAR_REFERENCES = MATCHED_SAMPLE_CULTIVAR_NAMES.map(
  (name) => {
    const normalizedName = name.toLowerCase();
    return {
      id: `cultivar-${normalizedName}`,
      normalizedName,
    };
  },
);

function getPendingCheckoutCustomerId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { customerId?: unknown };
    return typeof parsed.customerId === "string" ? parsed.customerId : null;
  } catch {
    return null;
  }
}

async function cleanupLocalOnboardingState({
  checkoutSessionId,
  clerkUserId,
}: {
  checkoutSessionId: string | null;
  clerkUserId: string | null;
}) {
  await withTempE2EDb(
    async (db) => {
      await db.$transaction(async (tx) => {
        const checkoutKey = checkoutSessionId
          ? `catalog-importer-checkout:${checkoutSessionId}`
          : null;
        const pendingCheckout = checkoutKey
          ? await tx.keyValue.findUnique({ where: { key: checkoutKey } })
          : null;
        const user = clerkUserId
          ? await tx.user.findUnique({
              where: { clerkUserId },
              select: { id: true, stripeCustomerId: true },
            })
          : null;
        const stripeCustomerId =
          user?.stripeCustomerId ??
          getPendingCheckoutCustomerId(pendingCheckout?.value);
        const keys = [
          checkoutKey,
          clerkUserId ? `clerk:user:${clerkUserId}` : null,
          stripeCustomerId ? `stripe:customer:${stripeCustomerId}` : null,
        ].filter((key): key is string => Boolean(key));

        if (keys.length > 0) {
          await tx.keyValue.deleteMany({ where: { key: { in: keys } } });
        }
        if (user) {
          await tx.user.delete({ where: { id: user.id } });
        }
      });
    },
    { clearFirst: false },
  );
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
  await codeInput.type(TEST_CODE, { delay: 100 });
}

test.describe("importer-first seller onboarding @local", () => {
  test("previews a catalog, starts Pro, and reaches the preserved import", async ({
    page,
    homePage,
  }, testInfo) => {
    test.slow();

    const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${testInfo.retry}`;
    const email = `importer-onboarding+clerk_test_${runId}@example.com`;
    let checkoutSessionId: string | null = null;
    let clerkUserId: string | null = null;

    await deleteClerkUserByEmail(email);
    await withTempE2EDb(
      async (db) => {
        const ids = MATCHED_SAMPLE_CULTIVAR_REFERENCES.map(({ id }) => id);
        await db.cultivarReference.deleteMany({ where: { id: { in: ids } } });
        await db.cultivarReference.createMany({
          data: MATCHED_SAMPLE_CULTIVAR_REFERENCES,
        });
      },
      { clearFirst: false },
    );

    try {
      await mockCultivarMatches(page);
      await homePage.goto();
      await homePage.isReady();
      await page
        .getByRole("link", { name: "Create your catalog" })
        .first()
        .click();
      await expect(page).toHaveURL(/\/start-membership/);

      const importerCta = page.getByTestId("start-membership-checkout").first();
      await expect(importerCta).toHaveAttribute("href", "/catalog-importer");
      await Promise.all([
        page.waitForURL(/\/catalog-importer/),
        importerCta.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: "Turn the catalog you already have into one buyers can browse",
        }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Use sample catalog" }).click();
      await page.getByRole("button", { name: "Build catalog preview" }).click();
      await expect(
        page.getByRole("region", { name: "Catalog preview ready" }),
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: SUBSCRIPTION_CONFIG.COPY.CTA.START_TRIAL,
        })
        .first()
        .click();
      await expect(page).toHaveURL(
        /\/catalog-importer\/checkout\?.*entry=catalog_importer/,
      );
      await page.getByLabel("Email address").fill(email);
      await page
        .getByRole("button", {
          name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_TRIAL,
        })
        .click();
      await expect(page).toHaveURL(
        /\/catalog-importer\/checkout\/success\?session_id=cs_test_catalog_importer_/,
        { timeout: 45_000 },
      );
      checkoutSessionId = new URL(page.url()).searchParams.get("session_id");

      await completeClerkEmailCodeFlow(page, email);
      await expect(page).toHaveURL(/\/dashboard\/imports$/, {
        timeout: 45_000,
      });
      await expect(
        page.getByRole("heading", { name: "Import catalog" }),
      ).toBeVisible();
      const importButton = page.getByRole("button", {
        name: /^Import \d+ listings$/,
      });
      await expect(importButton).toBeVisible();
      const importButtonLabel = await importButton.textContent();
      const importedListingCount = Number.parseInt(
        importButtonLabel?.match(/\d+/)?.[0] ?? "",
        10,
      );
      expect(importedListingCount).toBeGreaterThan(0);
      await importButton.click();
      await expect(
        page.getByRole("heading", {
          name: `Import ${importedListingCount} listings?`,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Import listings" }).click();
      await expect(
        page.getByRole("heading", {
          name: "All ready listings are in your catalog",
        }),
      ).toBeVisible({ timeout: 30_000 });

      clerkUserId = await getClerkUserIdByEmail(email);
      expect(clerkUserId).toBeTruthy();

      const dbState = await withTempE2EDb(
        async (db) => {
          const user = await db.user.findUniqueOrThrow({
            where: { clerkUserId: clerkUserId! },
            include: {
              listings: {
                select: {
                  cultivarReferenceId: true,
                  title: true,
                },
              },
            },
          });
          const subscriptionCache = await db.keyValue.findFirst({
            where: {
              key: { startsWith: `stripe:customer:${user.stripeCustomerId}` },
            },
          });

          return {
            listings: user.listings,
            stripeCustomerId: user.stripeCustomerId,
            subscriptionCache: subscriptionCache?.value ?? null,
          };
        },
        { clearFirst: false },
      );

      expect(dbState.stripeCustomerId).toMatch(/^cus_e2e_/);
      expect(dbState.listings).toHaveLength(importedListingCount);
      expect(
        dbState.listings.every((listing) => listing.cultivarReferenceId),
      ).toBe(true);
      expect(dbState.subscriptionCache).toContain('"status":"trialing"');
    } finally {
      clerkUserId ??= await getClerkUserIdByEmail(email).catch(() => null);
      try {
        await cleanupLocalOnboardingState({
          checkoutSessionId,
          clerkUserId,
        });
      } finally {
        try {
          await withTempE2EDb(
            async (db) => {
              await db.cultivarReference.deleteMany({
                where: {
                  id: {
                    in: MATCHED_SAMPLE_CULTIVAR_REFERENCES.map(({ id }) => id),
                  },
                },
              });
            },
            { clearFirst: false },
          );
        } finally {
          await deleteClerkUserByEmail(email);
        }
      }
    }
  });
});
