import { cache } from "react";
import { env, requireEnv } from "@/env";
import { getStripeClient } from "@/server/stripe/client";
import { formatMembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

export type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

const MEMBERSHIP_PRICE_CACHE_MS = 60 * 60 * 1000;
let cachedMembershipPriceDisplay:
  | {
      value: MembershipPriceDisplay;
      expiresAt: number;
    }
  | null = null;
let pendingMembershipPriceDisplay: Promise<MembershipPriceDisplay> | null =
  null;

async function loadMembershipPriceDisplay(): Promise<MembershipPriceDisplay> {
  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(
    requireEnv("STRIPE_PRICE_ID", env.STRIPE_PRICE_ID),
  );
  const display = formatMembershipPriceDisplay({
    unit_amount: price.unit_amount,
    unit_amount_decimal: price.unit_amount_decimal,
    currency: price.currency,
    recurring: price.recurring
      ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count,
        }
      : null,
  });

  if (!display) {
    throw new Error("Stripe membership price is missing an amount.");
  }

  return display;
}

export const getMembershipPriceDisplay = cache(
  async (): Promise<MembershipPriceDisplay> => {
    const now = Date.now();
    if (
      cachedMembershipPriceDisplay &&
      cachedMembershipPriceDisplay.expiresAt > now
    ) {
      return cachedMembershipPriceDisplay.value;
    }

    if (pendingMembershipPriceDisplay) {
      return pendingMembershipPriceDisplay;
    }

    pendingMembershipPriceDisplay = loadMembershipPriceDisplay()
      .then((value) => {
        cachedMembershipPriceDisplay = {
          value,
          expiresAt: Date.now() + MEMBERSHIP_PRICE_CACHE_MS,
        };
        return value;
      })
      .finally(() => {
        pendingMembershipPriceDisplay = null;
      });

    return pendingMembershipPriceDisplay;
  },
);
