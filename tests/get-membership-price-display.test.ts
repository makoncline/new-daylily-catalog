// @vitest-environment node

import { describe, expect, it } from "vitest";
import { formatMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";

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
