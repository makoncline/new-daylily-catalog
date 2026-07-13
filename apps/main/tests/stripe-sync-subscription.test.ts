// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  listSubscriptions: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    subscriptions: { list: mocks.listSubscriptions },
  }),
}));

vi.mock("@/server/db/kvStore", () => ({
  kvStore: {
    delete: vi.fn(),
    get: mocks.cacheGet,
    set: mocks.cacheSet,
  },
}));

vi.mock("@/lib/error-utils", () => ({
  reportError: mocks.reportError,
}));

import {
  getStripeSubscription,
  getStripeSubscriptionResult,
  syncStripeSubscriptionToKV,
} from "@/server/stripe/sync-subscription";

describe("Stripe subscription cache synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheGet.mockResolvedValue(null);
    mocks.cacheSet.mockResolvedValue(undefined);
  });

  it("stores a none status when the customer has no subscriptions", async () => {
    mocks.listSubscriptions.mockResolvedValue({ data: [] });

    await expect(syncStripeSubscriptionToKV("cus_none")).resolves.toEqual({
      status: "none",
    });
    expect(mocks.listSubscriptions).toHaveBeenCalledWith({
      customer: "cus_none",
      limit: 1,
      expand: ["data.default_payment_method"],
    });
    expect(mocks.cacheSet).toHaveBeenCalledWith("stripe:customer:cus_none", {
      status: "none",
    });
  });

  it("stores the mapped subscription and payment method", async () => {
    mocks.listSubscriptions.mockResolvedValue({
      data: [
        {
          id: "sub_test",
          status: "trialing",
          current_period_end: 200,
          current_period_start: 100,
          cancel_at_period_end: false,
          default_payment_method: {
            card: { brand: "visa", last4: "4242" },
          },
          items: {
            data: [
              {
                price: { id: "price_test" },
                current_period_end: 201,
                current_period_start: 101,
              },
            ],
          },
        },
      ],
    });

    const result = await syncStripeSubscriptionToKV("cus_test");

    expect(result).toEqual({
      subscriptionId: "sub_test",
      status: "trialing",
      priceId: "price_test",
      currentPeriodEnd: 200,
      currentPeriodStart: 100,
      cancelAtPeriodEnd: false,
      paymentMethod: { brand: "visa", last4: "4242" },
    });
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      "stripe:customer:cus_test",
      result,
    );
  });

  it("returns a cached subscription without calling Stripe", async () => {
    const cached = { subscriptionId: "sub_cached", status: "active" };
    mocks.cacheGet.mockResolvedValue(cached);

    await expect(getStripeSubscription("cus_cached")).resolves.toBe(cached);
    expect(mocks.listSubscriptions).not.toHaveBeenCalled();
  });

  it("reports a cache-miss sync failure and returns none", async () => {
    mocks.listSubscriptions.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(getStripeSubscription("cus_error")).resolves.toEqual({
      status: "none",
    });
    expect(mocks.reportError).toHaveBeenCalledOnce();
    const report = mocks.reportError.mock.calls[0]?.[0] as {
      context: Record<string, unknown>;
      error: Error;
    };
    expect(report.error.message).toContain(
      "Error fetching stripe subscription for user cus_error",
    );
    expect(report.context).toEqual({
      source: "getStripeSubscription",
      stripeCustomerId: "cus_error",
    });
  });

  it("marks a cache-miss sync failure as unconfirmed for entitlements", async () => {
    mocks.listSubscriptions.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(getStripeSubscriptionResult("cus_error")).resolves.toEqual({
      subscription: { status: "none" },
      confirmed: false,
    });
  });
});
