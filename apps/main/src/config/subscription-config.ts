import { z } from "zod";

export const subscriptionBillingOptionSchema = z.enum(["monthly", "annual"]);
export type SubscriptionBillingOption = z.infer<
  typeof subscriptionBillingOptionSchema
>;

export const SUBSCRIPTION_CONFIG = {
  PATHS: {
    DASHBOARD_SIGN_IN: "/sign-in",
    NEW_USER_ONBOARDING: "/catalog-importer",
    SELLER_SIGNUP: "/sign-up",
  },
  OFFER: {
    PRODUCT_NAME: "Daylily Catalog Pro",
  },
  COPY: {
    CTA: {
      CONTINUE_TO_CHECKOUT: "Continue to secure checkout",
      UPGRADE_TO_PRO: "Upgrade to Pro",
    },
    MARKETING: {
      FINAL_CTA:
        "Build and preview your catalog. Choose a paid membership when you are ready to publish.",
      HERO: "Build and preview your catalog first. Choose a membership when you are ready to publish.",
      HOW_IT_WORKS_TITLE: "Build first. Publish when you are ready.",
      MEMBERSHIP_FAQ_ANSWER:
        "Build and preview your catalog for free. Choose a paid membership when you are ready to publish it.",
      MEMBERSHIP_FAQ_QUESTION: "When do I choose a membership?",
      PUBLISH_STEP:
        "Choose a paid membership, select your public URL, and import the ready listings.",
      VALUE_PANEL:
        "Build and preview first. Choose a paid membership only when you are ready to publish your catalog.",
    },
    STATUS: {
      ACTIVE_DESCRIPTION:
        "Your membership is active. Review the ready listings, then import them into your dashboard.",
      ACTIVE_EYEBROW: "Membership active",
      INACTIVE_DESCRIPTION:
        "Your membership is not active yet. You can retry checkout, or contact support if you already paid.",
    },
  },
} as const;
