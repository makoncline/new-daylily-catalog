// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMembershipPriceDisplay } from "@/server/stripe/membership-price-display";

const stripeMocks = vi.hoisted(() => ({
  pricesRetrieve: vi.fn(),
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    prices: {
      retrieve: stripeMocks.pricesRetrieve,
    },
  }),
}));

describe("formatMembershipPriceDisplay", () => {
  it("formats whole-dollar monthly prices without decimals", () => {
    const result = formatMembershipPriceDisplay({
      unit_amount: 19900,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
    });

    expect(result).toEqual({
      amount: "$199",
      interval: "/mo",
      monthlyEquivalent: "$199",
    });
  });

  it("formats decimal amounts and interval counts", () => {
    const result = formatMembershipPriceDisplay({
      unit_amount: null,
      unit_amount_decimal: "1299",
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 3,
      },
    });

    expect(result).toEqual({
      amount: "$12.99",
      interval: "/3 mo",
      monthlyEquivalent: "$4.33",
    });
  });

  it("adds a monthly anchor for yearly plans", () => {
    const result = formatMembershipPriceDisplay({
      unit_amount: 6000,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "year",
        interval_count: 1,
      },
    });

    expect(result).toEqual({
      amount: "$60",
      interval: "/yr",
      monthlyEquivalent: "$5",
    });
  });

  it("returns null when the stripe price does not include an amount", () => {
    const result = formatMembershipPriceDisplay({
      unit_amount: null,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
    });

    expect(result).toBeNull();
  });
});

describe("getMembershipPriceDisplay", () => {
  beforeEach(() => {
    vi.resetModules();
    stripeMocks.pricesRetrieve.mockReset();
    process.env.SKIP_ENV_VALIDATION = "1";
    process.env.STRIPE_SECRET_KEY = "sk_test_price_display";
    process.env.STRIPE_PRICE_ID = "price_membership_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_clerk";
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://example.com";
  });

  it("fetches the configured Stripe price when env validation is skipped", async () => {
    stripeMocks.pricesRetrieve.mockResolvedValue({
      unit_amount: 12000,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "year",
        interval_count: 1,
      },
    });

    const { getMembershipPriceDisplay } = await import(
      "@/server/stripe/get-membership-price-display"
    );

    await expect(getMembershipPriceDisplay()).resolves.toEqual({
      amount: "$120",
      interval: "/yr",
      monthlyEquivalent: "$10",
    });
    expect(stripeMocks.pricesRetrieve).toHaveBeenCalledWith(
      "price_membership_test",
    );
  });

  it("reuses the in-process price cache", async () => {
    stripeMocks.pricesRetrieve.mockResolvedValue({
      unit_amount: 12000,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "year",
        interval_count: 1,
      },
    });

    const { getMembershipPriceDisplay } = await import(
      "@/server/stripe/get-membership-price-display"
    );

    await expect(getMembershipPriceDisplay()).resolves.toEqual({
      amount: "$120",
      interval: "/yr",
      monthlyEquivalent: "$10",
    });
    await expect(getMembershipPriceDisplay()).resolves.toEqual({
      amount: "$120",
      interval: "/yr",
      monthlyEquivalent: "$10",
    });
    expect(stripeMocks.pricesRetrieve).toHaveBeenCalledTimes(1);
  });

  it("throws when the configured Stripe price does not include an amount", async () => {
    stripeMocks.pricesRetrieve.mockResolvedValue({
      unit_amount: null,
      unit_amount_decimal: null,
      currency: "usd",
      recurring: {
        interval: "year",
        interval_count: 1,
      },
    });

    const { getMembershipPriceDisplay } = await import(
      "@/server/stripe/get-membership-price-display"
    );

    await expect(getMembershipPriceDisplay()).rejects.toThrow(
      "Stripe membership price is missing an amount.",
    );
  });
});
