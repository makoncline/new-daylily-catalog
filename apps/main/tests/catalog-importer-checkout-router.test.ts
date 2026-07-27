// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/catalog-importer-checkout-router.sqlite";
process.env.STRIPE_SECRET_KEY ??= "sk_test_unit";
process.env.STRIPE_PRICE_ID ??= "price_test_unit";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_clerk";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://example.com";

const stripeMocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  checkoutRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
}));

const subscriptionMocks = vi.hoisted(() => ({
  getStripeSubscription: vi.fn(),
}));

const baseUrlMocks = vi.hoisted(() => ({
  canonicalBaseUrl: "https://daylilycatalog.test",
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: stripeMocks.checkoutCreate,
        retrieve: stripeMocks.checkoutRetrieve,
      },
    },
    subscriptions: {
      retrieve: stripeMocks.subscriptionRetrieve,
    },
  }),
}));

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscription: subscriptionMocks.getStripeSubscription,
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => baseUrlMocks.canonicalBaseUrl,
  getRequestBaseUrl: (headers?: Headers | null) => {
    const host = headers?.get("x-forwarded-host") ?? headers?.get("host");
    if (!host) {
      return baseUrlMocks.canonicalBaseUrl;
    }

    const protocol = headers?.get("x-forwarded-proto") ?? "http";
    return `${protocol}://${host}`;
  },
}));

type CatalogImporterRouterModule =
  typeof import("@/server/api/routers/catalog-importer");
let catalogImporterRouter: CatalogImporterRouterModule["catalogImporterRouter"];

beforeAll(async () => {
  ({ catalogImporterRouter } = await import(
    "@/server/api/routers/catalog-importer"
  ));
});

function createPublicCaller(db: unknown, headers = new Headers()) {
  return catalogImporterRouter.createCaller({
    db: db as TRPCInternalContext["db"],
    headers,
  });
}

function checkoutInput(email = "seller@example.com") {
  return {
    conversionId: "123e4567-e89b-42d3-a456-426614174000",
    email,
    entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
    returnTo: CATALOG_IMPORTER_RETURN_PATH,
  } as const;
}

describe("catalog importer checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseUrlMocks.canonicalBaseUrl = "https://daylilycatalog.test";
    delete process.env.PLAYWRIGHT_LOCAL_E2E;
    subscriptionMocks.getStripeSubscription.mockResolvedValue({
      status: "none",
    });

    stripeMocks.checkoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_importer",
    });
  });

  it("creates an attributed importer checkout without Clerk auth", async () => {
    const caller = createPublicCaller({ user: {} });

    const result = await caller.createCheckout(checkoutInput());

    expect(result.url).toBe(
      "https://checkout.stripe.com/c/pay/cs_test_importer",
    );
    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith({
      customer_email: "seller@example.com",
      mode: "subscription",
      line_items: [{ price: "price_test_unit", quantity: 1 }],
      subscription_data: {
        trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
        metadata: {
          email: "seller@example.com",
          conversion_id: checkoutInput().conversionId,
          entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
          return_to: CATALOG_IMPORTER_RETURN_PATH,
        },
      },
      success_url:
        "https://daylilycatalog.test/catalog-importer/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://daylilycatalog.test/catalog-importer",
      metadata: {
        email: "seller@example.com",
        conversion_id: checkoutInput().conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        return_to: CATALOG_IMPORTER_RETURN_PATH,
      },
      client_reference_id: checkoutInput().conversionId,
    });
  });

  it("uses the localhost request origin for checkout return URLs", async () => {
    baseUrlMocks.canonicalBaseUrl = "http://localhost:3000";
    const caller = createPublicCaller(
      { user: {} },
      new Headers({ host: "localhost:3007" }),
    );

    await caller.createCheckout(checkoutInput());

    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "http://localhost:3007/catalog-importer/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3007/catalog-importer",
      }),
    );
  });

  it("claims a local checkout without creating profile or listing data", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const publicCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));
      const checkout = await publicCaller.catalogImporter.createCheckout(
        checkoutInput("importer@example.com"),
      );
      const sessionId = new URL(checkout.url).searchParams.get("session_id");
      expect(sessionId).toBeTruthy();

      const user = await db.user.create({
        data: { clerkUserId: "clerk_importer_user" },
      });
      const authedCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...user,
          clerk: { email: "importer@example.com", createdAt: Date.now() },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      await expect(
        authedCaller.catalogImporter.claimCheckout({ sessionId: sessionId! }),
      ).resolves.toEqual({ ok: true });

      const updatedUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });
      expect(updatedUser.stripeCustomerId).toMatch(/^cus_e2e_/);
      await expect(
        db.userProfile.findUnique({ where: { userId: user.id } }),
      ).resolves.toBeNull();
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
    });
  });

  it("rejects a claim from a different account email", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const publicCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));
      const checkout = await publicCaller.catalogImporter.createCheckout(
        checkoutInput("checkout@example.com"),
      );
      const sessionId = new URL(checkout.url).searchParams.get("session_id")!;
      const user = await db.user.create({
        data: { clerkUserId: "clerk_wrong_email" },
      });
      const authedCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...user,
          clerk: { email: "other@example.com", createdAt: Date.now() },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      await expect(
        authedCaller.catalogImporter.claimCheckout({ sessionId }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("claims attributed Stripe checkouts and rejects legacy metadata", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const { getCatalogImporterCheckoutStatus } = await import(
        "@/server/catalog-importer/checkout-service"
      );
      stripeMocks.checkoutRetrieve.mockResolvedValue({
        id: "cs_test_claim",
        metadata: {
          entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
          return_to: CATALOG_IMPORTER_RETURN_PATH,
        },
        customer: "cus_claimed",
        customer_email: "paid@example.com",
        subscription: { status: "trialing" },
      });

      await expect(
        getCatalogImporterCheckoutStatus(db, "cs_test_claim"),
      ).resolves.toMatchObject({
        email: "paid@example.com",
        isActive: true,
      });

      const user = await db.user.create({
        data: { clerkUserId: "clerk_claim_stripe_checkout" },
      });
      const caller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...user,
          clerk: { email: "paid@example.com", createdAt: Date.now() },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      await expect(
        caller.catalogImporter.claimCheckout({ sessionId: "cs_test_claim" }),
      ).resolves.toEqual({ ok: true });

      await expect(
        db.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { stripeCustomerId: true },
        }),
      ).resolves.toEqual({ stripeCustomerId: "cus_claimed" });

      stripeMocks.checkoutRetrieve.mockResolvedValue({
        id: "cs_test_legacy_onboarding",
        metadata: { flow: "anonymous_onboarding" },
      });
      await expect(
        getCatalogImporterCheckoutStatus(db, "cs_test_legacy_onboarding"),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("creates signed-in importer checkout through its own procedure", async () => {
    const caller = catalogImporterRouter.createCaller({
      db: {
        user: {
          update: vi.fn(),
        },
      } as unknown as TRPCInternalContext["db"],
      headers: new Headers(),
      _authUser: {
        id: "user-importer",
        stripeCustomerId: "cus_importer",
        clerk: { email: "importer@example.com" },
      } as unknown as TRPCInternalContext["_authUser"],
    });
    const input = {
      conversionId: "123e4567-e89b-42d3-a456-426614174000",
      entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
      returnTo: CATALOG_IMPORTER_RETURN_PATH,
    } as const;

    await caller.createSignedInCheckout(input);

    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "https://daylilycatalog.test/catalog-importer",
        metadata: {
          userId: "user-importer",
          conversion_id: input.conversionId,
          entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        },
        success_url:
          "https://daylilycatalog.test/subscribe/success?redirect=%2Fdashboard%2Fimports%2Fsetup",
      }),
    );
  });
});
