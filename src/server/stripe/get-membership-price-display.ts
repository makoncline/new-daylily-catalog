import { cache } from "react";
import { env } from "@/env";
import { stripe } from "@/server/stripe/client";

interface MembershipRecurring {
  interval: "day" | "week" | "month" | "year";
  interval_count: number | null;
}

export interface MembershipPriceLike {
  unit_amount: number | null;
  unit_amount_decimal: string | null;
  currency: string;
  recurring: MembershipRecurring | null;
}

export interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

const INTERVAL_LABEL: Record<MembershipRecurring["interval"], string> = {
  day: "day",
  week: "wk",
  month: "mo",
  year: "yr",
};

function toMajorUnitAmount(price: MembershipPriceLike): number | null {
  if (price.unit_amount !== null) {
    return price.unit_amount / 100;
  }

  if (price.unit_amount_decimal === null) {
    return null;
  }

  const amount = Number.parseFloat(price.unit_amount_decimal);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount / 100;
}

function formatInterval(recurring: MembershipRecurring | null): string {
  if (!recurring) {
    return "";
  }

  const intervalLabel = INTERVAL_LABEL[recurring.interval];

  if (recurring.interval_count && recurring.interval_count > 1) {
    return `/${recurring.interval_count} ${intervalLabel}`;
  }

  return `/${intervalLabel}`;
}

function formatCurrency(amount: number, currency: string): string {
  const hasFraction = !Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMonthlyEquivalent(
  amount: number,
  recurring: MembershipRecurring | null,
  currency: string,
): string | null {
  if (!recurring) {
    return null;
  }

  const intervalCount = recurring.interval_count && recurring.interval_count > 0
    ? recurring.interval_count
    : 1;

  if (recurring.interval === "month") {
    return formatCurrency(amount / intervalCount, currency);
  }

  if (recurring.interval === "year") {
    return formatCurrency(amount / (12 * intervalCount), currency);
  }

  return null;
}

export function formatMembershipPriceDisplay(
  price: MembershipPriceLike,
): MembershipPriceDisplay | null {
  const amount = toMajorUnitAmount(price);
  if (amount === null) {
    return null;
  }

  const currency = price.currency.toUpperCase();
  const formattedAmount = formatCurrency(amount, currency);

  return {
    amount: formattedAmount,
    interval: formatInterval(price.recurring),
    monthlyEquivalent: formatMonthlyEquivalent(amount, price.recurring, currency),
  };
}

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
