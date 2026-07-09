// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/onboarding-router.sqlite";
process.env.STRIPE_SECRET_KEY ??= "sk_test_unit";
process.env.STRIPE_PRICE_ID ??= "price_test_unit";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_clerk";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://example.com";

const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutCreate: vi.fn(),
  checkoutRetrieve: vi.fn(),
}));

const posthogMocks = vi.hoisted(() => ({
  captureServerPosthogEvent: vi.fn(),
}));

const baseUrlMocks = vi.hoisted(() => ({
  canonicalBaseUrl: "https://daylilycatalog.test",
}));

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: posthogMocks.captureServerPosthogEvent,
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    customers: {
      create: stripeMocks.customersCreate,
    },
    checkout: {
      sessions: {
        create: stripeMocks.checkoutCreate,
        retrieve: stripeMocks.checkoutRetrieve,
      },
    },
  }),
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

type OnboardingRouterModule = typeof import("@/server/api/routers/onboarding");
let onboardingRouter: OnboardingRouterModule["onboardingRouter"];

beforeAll(async () => {
  ({ onboardingRouter } = await import("@/server/api/routers/onboarding"));
});

function createPublicCaller(db: unknown, headers = new Headers()) {
  return onboardingRouter.createCaller({
    db: db as TRPCInternalContext["db"],
    headers,
  });
}

describe("onboarding router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseUrlMocks.canonicalBaseUrl = "https://daylilycatalog.test";
    delete process.env.PLAYWRIGHT_LOCAL_E2E;

    stripeMocks.checkoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_anon",
    });
  });

  it("captures anonymous onboarding email leads with stage context", async () => {
    const caller = createPublicCaller({ user: {} });

    await caller.collectEmail({
      draftId: "draft-123",
      email: "Lead@Example.com",
      stage: "pre_checkout_review",
      changed: true,
    });

    expect(posthogMocks.captureServerPosthogEvent).toHaveBeenCalledWith({
      distinctId: "draft-123",
      event: "onboarding_email_collected",
      properties: {
        draftId: "draft-123",
        email: "lead@example.com",
        emailDomain: "example.com",
        stage: "pre_checkout_review",
        changed: true,
        source: "anonymous_onboarding",
      },
    });
  });

  it("creates anonymous Stripe checkout without Clerk auth", async () => {
    const caller = createPublicCaller({ user: {} });

    const result = await caller.createCheckout({
      draftId: "draft-abc",
      email: "buyer@example.com",
    });

    expect(result.url).toBe("https://checkout.stripe.com/c/pay/cs_test_anon");
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    const checkoutCreateInput = stripeMocks.checkoutCreate.mock.calls[0]?.[0];
    expect(checkoutCreateInput).not.toHaveProperty("customer");
    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "buyer@example.com",
        mode: "subscription",
        line_items: [{ price: "price_test_unit", quantity: 1 }],
        subscription_data: {
          trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
          metadata: {
            flow: "anonymous_onboarding",
            draftId: "draft-abc",
            email: "buyer@example.com",
          },
        },
        success_url:
          "https://daylilycatalog.test/onboarding/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://daylilycatalog.test/onboarding",
        metadata: {
          flow: "anonymous_onboarding",
          draftId: "draft-abc",
          email: "buyer@example.com",
        },
        client_reference_id: "draft-abc",
      }),
    );
  });

  it("uses the localhost request origin for checkout return URLs", async () => {
    baseUrlMocks.canonicalBaseUrl = "http://localhost:3000";
    const caller = createPublicCaller(
      { user: {} },
      new Headers({ host: "localhost:3007" }),
    );

    await caller.createCheckout({
      draftId: "draft-localhost",
      email: "buyer@example.com",
    });

    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "http://localhost:3007/onboarding/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3007/onboarding",
      }),
    );
  });

  it("does not fall through to Stripe when local e2e checkout details are missing", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));

      await expect(
        caller.onboarding.getCheckoutStatus({
          sessionId: "cs_test_onboarding_missing",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(stripeMocks.checkoutRetrieve).not.toHaveBeenCalled();
    });
  });

  it("claims a local e2e checkout, imports profile only, and creates no listing", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");

      const publicCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));
      const checkout = await publicCaller.onboarding.createCheckout({
        draftId: "draft-e2e",
        email: "paid@example.com",
      });
      const sessionId = new URL(checkout.url).searchParams.get("session_id");
      expect(sessionId).toBeTruthy();

      const user = await db.user.create({
        data: { clerkUserId: "clerk_new_user" },
      });
      const authedCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...user,
          clerk: { email: "paid@example.com", createdAt: Date.now() },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      const claim = await authedCaller.onboarding.claimCheckout({
        sessionId: sessionId!,
        profile: {
          gardenName: "Paid Daylily Farm",
          location: "Denver, CO",
          description: "Small daylily garden with clear seasonal shipping.",
          profileImageDataUrl:
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
        },
      });

      expect(claim).toMatchObject({
        ok: true,
        importedProfile: true,
      });

      const updatedUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });
      expect(updatedUser.stripeCustomerId).toMatch(/^cus_e2e_/);

      const profile = await db.userProfile.findUniqueOrThrow({
        where: { userId: user.id },
        include: { images: true },
      });
      expect(profile.title).toBe("Paid Daylily Farm");
      expect(profile.location).toBe("Denver, CO");
      expect(profile.images).toHaveLength(1);
      expect(profile.images[0]?.status).toBe("onboarding-import-local-e2e");

      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
    });
  });

  it("ignores onboarding profile draft for a pre-existing app user", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const existingUser = await db.user.create({
        data: {
          clerkUserId: "clerk_existing_user",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
      await db.userProfile.create({
        data: {
          userId: existingUser.id,
          slug: existingUser.id,
          title: "Existing Garden",
        },
      });

      const publicCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));
      const checkout = await publicCaller.onboarding.createCheckout({
        draftId: "draft-existing",
        email: "existing@example.com",
      });
      const sessionId = new URL(checkout.url).searchParams.get("session_id");
      expect(sessionId).toBeTruthy();

      const authedCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...existingUser,
          clerk: {
            email: "existing@example.com",
            createdAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
          },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      const claim = await authedCaller.onboarding.claimCheckout({
        sessionId: sessionId!,
        profile: {
          gardenName: "Imported Name",
          location: "Imported Location",
          description: "Imported Description",
          profileImageDataUrl: null,
        },
      });

      expect(claim).toMatchObject({
        ok: true,
        importedProfile: false,
      });

      const profile = await db.userProfile.findUniqueOrThrow({
        where: { userId: existingUser.id },
      });
      expect(profile.title).toBe("Existing Garden");
    });
  });

  it("ignores onboarding draft when an old Clerk account gets a new app user row", async () => {
    process.env.PLAYWRIGHT_LOCAL_E2E = "true";

    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");

      const publicCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
      }));
      const checkout = await publicCaller.onboarding.createCheckout({
        draftId: "draft-lazy-existing",
        email: "lazy-existing@example.com",
      });
      const sessionId = new URL(checkout.url).searchParams.get("session_id");
      expect(sessionId).toBeTruthy();

      const lazyAppUser = await db.user.create({
        data: { clerkUserId: "clerk_lazy_existing_user" },
      });
      const authedCaller = createCaller(async () => ({
        db,
        headers: new Headers(),
        _authUser: {
          ...lazyAppUser,
          clerk: {
            email: "lazy-existing@example.com",
            createdAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
          },
        } as unknown as TRPCInternalContext["_authUser"],
      }));

      const claim = await authedCaller.onboarding.claimCheckout({
        sessionId: sessionId!,
        profile: {
          gardenName: "Should Not Import",
          location: "Should Not Import",
          description: "Should Not Import",
          profileImageDataUrl: null,
        },
      });

      expect(claim).toMatchObject({
        ok: true,
        importedProfile: false,
      });

      await expect(
        db.userProfile.findUnique({ where: { userId: lazyAppUser.id } }),
      ).resolves.toBeNull();
    });
  });

  it("claims a Stripe checkout and imports profile after account creation", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const checkoutCreated = Math.floor(Date.now() / 1000) - 1;

      stripeMocks.checkoutRetrieve.mockResolvedValue({
        id: "cs_test_claim",
        metadata: { flow: "anonymous_onboarding" },
        customer: "cus_claimed",
        customer_email: "paid@example.com",
        subscription: { status: "trialing" },
        created: checkoutCreated,
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

      const claim = await caller.onboarding.claimCheckout({
        sessionId: "cs_test_claim",
        profile: {
          gardenName: "Paid Daylily Farm",
          location: "Denver, CO",
          description: "Small daylily garden with clear seasonal shipping.",
          profileImageDataUrl: null,
        },
      });

      expect(claim).toMatchObject({
        ok: true,
        importedProfile: true,
      });

      const updatedUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });
      expect(updatedUser.stripeCustomerId).toBe("cus_claimed");

      const profile = await db.userProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(profile.title).toBe("Paid Daylily Farm");
    });
  });
});
