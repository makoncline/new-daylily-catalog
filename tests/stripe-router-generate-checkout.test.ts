// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/stripe-router.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";
process.env.CLERK_SECRET_KEY ??= "sk_test_clerk";
process.env.CLERK_WEBHOOK_SECRET ??= "whsec_test_clerk";
process.env.STRIPE_SECRET_KEY ??= "sk_test_stripe";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_stripe";
process.env.STRIPE_PRICE_ID ??= "price_test_123";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_BUCKET_NAME ??= "test";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_clerk";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://example.com";

const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutCreate: vi.fn(),
}));

vi.mock("@/server/stripe/client", () => ({
  stripe: {
    customers: {
      create: stripeMocks.customersCreate,
    },
    checkout: {
      sessions: {
        create: stripeMocks.checkoutCreate,
      },
    },
  },
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getBaseUrl: () => "http://localhost:3000",
}));

type StripeRouterModule = typeof import("@/server/api/routers/stripe");
let stripeRouter: StripeRouterModule["stripeRouter"];

beforeAll(async () => {
  ({ stripeRouter } = await import("@/server/api/routers/stripe"));
});

interface MockDb {
  user: {
    update: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    user: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function createCaller(
  db: MockDb,
  user: {
    id: string;
    stripeCustomerId: string | null;
    clerkEmail?: string;
  },
) {
  return stripeRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: {
      id: user.id,
      stripeCustomerId: user.stripeCustomerId,
      clerk: {
        email: user.clerkEmail ?? "test@example.com",
      },
    } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("stripe.generateCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.checkoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/test",
    });
  });

  it("creates checkout with a trial period for an existing Stripe customer", async () => {
    const db = createMockDb();
    const caller = createCaller(db, {
      id: "user-1",
      stripeCustomerId: "cus_existing",
    });

    await caller.generateCheckout();

    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();

    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        mode: "subscription",
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        subscription_data: {
          trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
        },
      }),
    );
  });

  it("creates a Stripe customer when needed and still applies the trial period", async () => {
    stripeMocks.customersCreate.mockResolvedValue({
      id: "cus_new",
    });
    const db = createMockDb();
    const caller = createCaller(db, {
      id: "user-2",
      stripeCustomerId: null,
      clerkEmail: "new-user@example.com",
    });

    await caller.generateCheckout();

    expect(stripeMocks.customersCreate).toHaveBeenCalledWith({
      email: "new-user@example.com",
      metadata: {
        userId: "user-2",
      },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { stripeCustomerId: "cus_new" },
    });
    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_new",
        subscription_data: {
          trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
        },
      }),
    );
  });
});
