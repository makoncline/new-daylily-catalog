// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/stripe-router-integration.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";
process.env.STRIPE_SECRET_KEY ??= "sk_test_unit";
process.env.STRIPE_PRICE_ID ??= "price_test_unit";

const mockStripeCustomersCreate = vi.hoisted(() => vi.fn());
const mockStripeCheckoutSessionsCreate = vi.hoisted(() => vi.fn());
const mockStripeSubscriptionsList = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe/client", () => ({
  stripe: {
    customers: {
      create: mockStripeCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mockStripeCheckoutSessionsCreate,
      },
    },
    subscriptions: {
      list: mockStripeSubscriptionsList,
    },
  },
}));

async function createAuthedCaller(userId: string) {
  const { db } = await import("@/server/db");
  const { createCaller } = await import("@/server/api/root");

  const caller = createCaller(async () => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return {
      db,
      headers: new Headers(),
      _authUser: user as unknown as TRPCInternalContext["_authUser"],
    } satisfies TRPCInternalContext;
  });

  return { db, caller };
}

describe("stripe router integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockStripeCustomersCreate.mockResolvedValue({
      id: "cus_new_customer",
    });

    mockStripeCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    mockStripeSubscriptionsList.mockResolvedValue({
      data: [],
    });
  });

  it("generateCheckout creates a Stripe customer binding for first-time users", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db, caller } = await createAuthedCaller(user.id);

      const result = await caller.stripe.generateCheckout();

      expect(result.url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
      expect(mockStripeCustomersCreate).toHaveBeenCalledTimes(1);
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);

      expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: user.id },
        }),
      );

      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_new_customer",
          mode: "subscription",
          line_items: [
            {
              price: process.env.STRIPE_PRICE_ID,
              quantity: 1,
            },
          ],
        }),
      );

      const updatedUser = await db.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      expect(updatedUser?.stripeCustomerId).toBe("cus_new_customer");
    });
  });

  it("generateCheckout blocks users who already have an active subscription", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db, caller } = await createAuthedCaller(user.id);

      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: "cus_active_user" },
      });

      const activeSub = {
        subscriptionId: "sub_active",
        status: "active",
        priceId: "price_pro",
        currentPeriodStart: 1700000000,
        currentPeriodEnd: 1702592000,
        cancelAtPeriodEnd: false,
        paymentMethod: null,
      };

      await db.keyValue.upsert({
        where: { key: "stripe:customer:cus_active_user" },
        update: {
          value: JSON.stringify(activeSub),
        },
        create: {
          key: "stripe:customer:cus_active_user",
          value: JSON.stringify(activeSub),
        },
      });

      await expect(caller.stripe.generateCheckout()).rejects.toMatchObject({
        code: "CONFLICT",
      });

      expect(mockStripeCustomersCreate).not.toHaveBeenCalled();
      expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
      expect(mockStripeSubscriptionsList).not.toHaveBeenCalled();
    });
  });
});
