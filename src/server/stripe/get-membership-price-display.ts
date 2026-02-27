import { cache } from "react";
import { env } from "@/env";
import { stripe } from "@/server/stripe/client";
import {
  formatMembershipPriceDisplay,
} from "@/server/stripe/membership-price-display";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

export type {
  MembershipPriceDisplay,
  MembershipPriceLike,
} from "@/server/stripe/membership-price-display";

export const getMembershipPriceDisplay = cache(
  async (): Promise<MembershipPriceDisplay | null> => {
    if (process.env.SKIP_ENV_VALIDATION === "1") {
      return null;
    }

    try {
      const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID);
      return formatMembershipPriceDisplay({
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
    } catch (error) {
      console.error("Failed to load Stripe membership price", error);
      return null;
    }
  },
);
