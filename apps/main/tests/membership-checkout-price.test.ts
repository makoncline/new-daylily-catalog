// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  checkoutUpdate: vi.fn(),
  lineItemsList: vi.fn(),
  pricesList: vi.fn(),
  subscriptionUpdate: vi.fn(),
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        listLineItems: stripeMocks.lineItemsList,
        update: stripeMocks.checkoutUpdate,
      },
    },
    prices: { list: stripeMocks.pricesList },
    subscriptions: { update: stripeMocks.subscriptionUpdate },
  }),
}));

import {
  finalizeMembershipCheckoutSession,
  getMembershipBillingOption,
  getMembershipCheckoutPrice,
  MEMBERSHIP_CHECKOUT_LOOKUP_KEY,
} from "@/server/stripe/membership-checkout-price";

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: "price_monthly",
    active: true,
    currency: "usd",
    product: "prod_membership",
    recurring: { interval: "month", interval_count: 1 },
    type: "recurring",
    unit_amount: 1299,
    unit_amount_decimal: null,
    ...overrides,
  };
}

describe("Stripe-hosted membership pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.pricesList.mockResolvedValue({ data: [price()] });
    stripeMocks.checkoutUpdate.mockResolvedValue({});
    stripeMocks.subscriptionUpdate.mockResolvedValue({});
  });

  it("resolves the monthly Checkout entry price by stable lookup key", async () => {
    await expect(getMembershipCheckoutPrice()).resolves.toEqual({
      currency: "usd",
      priceId: "price_monthly",
      productId: "prod_membership",
    });
    expect(stripeMocks.pricesList).toHaveBeenCalledWith({
      active: true,
      limit: 2,
      lookup_keys: [MEMBERSHIP_CHECKOUT_LOOKUP_KEY],
      type: "recurring",
    });
  });

  it.each([
    ["no matching price", []],
    ["more than one matching price", [price(), price({ id: "price_other" })]],
    [
      "the wrong entry interval",
      [price({ recurring: { interval: "year", interval_count: 1 } })],
    ],
    ["an invalid monthly price", [price({ unit_amount: null })]],
  ])("fails closed for %s", async (_label, prices) => {
    stripeMocks.pricesList.mockResolvedValue({ data: prices });
    await expect(getMembershipCheckoutPrice()).rejects.toThrow();
  });

  it("maps Stripe's selected yearly upsell to annual", () => {
    expect(
      getMembershipBillingOption({
        currency: "usd",
        lineItems: [
          {
            price: price({
              recurring: { interval: "year", interval_count: 1 },
            }),
          },
        ] as never,
        productId: "prod_membership",
      }),
    ).toBe("annual");
  });

  it.each([
    ["a different currency", { currency: "eur" }],
    ["a different product", { product: "prod_other" }],
    ["an inactive price", { active: false }],
    [
      "an unsupported interval",
      { recurring: { interval: "week", interval_count: 1 } },
    ],
  ])("rejects a completed line item with %s", (_label, overrides) => {
    expect(() =>
      getMembershipBillingOption({
        currency: "usd",
        lineItems: [{ price: price(overrides) }] as never,
        productId: "prod_membership",
      }),
    ).toThrow();
  });

  it("writes the final hosted choice to Checkout and subscription metadata", async () => {
    stripeMocks.lineItemsList.mockResolvedValue({
      data: [
        {
          price: price({
            id: "price_annual",
            recurring: { interval: "year", interval_count: 1 },
            unit_amount: 7999,
          }),
        },
      ],
    });
    const session = {
      id: "cs_membership",
      metadata: {
        billing_choice: "stripe_checkout_upsell",
        membership_currency: "usd",
        membership_product_id: "prod_membership",
      },
      subscription: "sub_membership",
    } as never;

    await expect(finalizeMembershipCheckoutSession(session)).resolves.toBe(
      "annual",
    );
    expect(stripeMocks.checkoutUpdate).toHaveBeenCalledWith("cs_membership", {
      metadata: { billing_option: "annual" },
    });
    expect(stripeMocks.subscriptionUpdate).toHaveBeenCalledWith(
      "sub_membership",
      { metadata: { billing_option: "annual" } },
    );
  });
});
