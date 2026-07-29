type SubscriptionDurationUnit = "day" | "week" | "month" | "year";

interface SubscriptionDuration {
  count: number;
  unit: SubscriptionDurationUnit;
}

type SubscriptionIntroOffer =
  | {
      kind: "free";
      duration: SubscriptionDuration;
    }
  | {
      amountCents: number;
      currency: string;
      duration: SubscriptionDuration;
      kind: "paid";
    };

export interface SubscriptionPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

const INTRO_OFFER: SubscriptionIntroOffer = {
  kind: "free",
  duration: {
    count: 7,
    unit: "day",
  },
};

const DEFAULT_BILLING_OPTION = {
  id: "annual",
  interval: "year",
  label: "Yearly",
  stripePriceEnvironmentVariable: "STRIPE_PRICE_ID",
} as const;

const CANCEL_ANYTIME = "Cancel anytime";

function pluralizeDuration({ count, unit }: SubscriptionDuration) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function compoundDuration({ count, unit }: SubscriptionDuration) {
  return `${count}-${unit}`;
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function introOfferSummary() {
  if (INTRO_OFFER.kind === "free") {
    return `${pluralizeDuration(INTRO_OFFER.duration)} free`;
  }

  return `${formatCurrency(
    INTRO_OFFER.amountCents,
    INTRO_OFFER.currency,
  )} for ${pluralizeDuration(INTRO_OFFER.duration)}`;
}

function introOfferTodayCopy() {
  if (INTRO_OFFER.kind === "free") {
    return "No charge today";
  }

  return `${formatCurrency(
    INTRO_OFFER.amountCents,
    INTRO_OFFER.currency,
  )} today`;
}

const TRIAL_DURATION = compoundDuration(INTRO_OFFER.duration);

export const SUBSCRIPTION_CONFIG = {
  PATHS: {
    DASHBOARD_SIGN_IN: "/sign-in",
    NEW_USER_ONBOARDING: "/catalog-importer",
    SELLER_SIGNUP: "/sign-up",
  },
  OFFER: {
    PRODUCT_NAME: "Daylily Catalog Pro",
    INTRO: INTRO_OFFER,
    DEFAULT_BILLING_OPTION_ID: DEFAULT_BILLING_OPTION.id,
    BILLING_OPTIONS: [DEFAULT_BILLING_OPTION],
  },
  COPY: {
    CTA: {
      CONTINUE_TO_TRIAL: "Continue to trial",
      START_TRIAL: `Start ${TRIAL_DURATION} Pro trial`,
      UPGRADE_TO_PRO: "Upgrade to Pro",
    },
    CHECKOUT: {
      FOOTNOTE: `${introOfferTodayCopy()} · ${CANCEL_ANYTIME}`,
      METADATA_TITLE: "Start Your Catalog Trial | Daylily Catalog",
      TITLE: "Start your Pro trial",
    },
    IMPORTER: {
      PRICE_UNAVAILABLE: "Progress stays in this browser.",
    },
    MARKETING: {
      FINAL_CTA:
        "Build and preview your catalog, start your trial, then open your dashboard.",
      HERO_TRIAL: `Start a ${TRIAL_DURATION} trial before your dashboard opens.`,
      HOW_IT_WORKS_TITLE: "Build first. Start your trial when ready.",
      PUBLISH_STEP:
        "Start your trial, choose your public URL, and import the ready listings.",
      TRIAL_FAQ_ANSWER:
        "The trial starts at checkout, before your dashboard opens.",
      TRIAL_FAQ_QUESTION: "When does my free trial start?",
      TRIAL_PRICE: `Start your ${TRIAL_DURATION} trial before your paid dashboard opens.`,
    },
    STATUS: {
      ACTIVE_DESCRIPTION:
        "Your trial is active. Review the ready listings, then import them into your dashboard.",
      ACTIVE_EYEBROW: "Trial active",
      INACTIVE_DESCRIPTION:
        "Your trial or membership is not active yet. You can retry checkout, or contact support if you already paid.",
    },
    CANCEL_ANYTIME,
  },
} as const;

export function getSubscriptionPriceCopy(price: SubscriptionPriceDisplay) {
  const recurringPrice = `${price.amount}${price.interval}`;
  const summary = `${introOfferSummary()}, then ${recurringPrice}`;

  return {
    checkoutSummary: `${summary}.`,
    recurringPrice,
    summaryWithCancellation: `${summary} · ${CANCEL_ANYTIME}`,
  };
}

export function getDefaultSubscriptionBillingOption() {
  return DEFAULT_BILLING_OPTION;
}

export function getStripeTrialPeriodDays() {
  if (INTRO_OFFER.kind !== "free" || INTRO_OFFER.duration.unit !== "day") {
    throw new Error(
      "Stripe Checkout currently supports only a free introductory offer measured in days.",
    );
  }

  return INTRO_OFFER.duration.count;
}
