import { TRPCError } from "@trpc/server";
import {
  getDefaultSubscriptionBillingOption,
  getStripeTrialPeriodDays,
} from "@/config/subscription-config";
import { env, requireEnv } from "@/env";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { getStripeClient } from "@/server/stripe/client";
import {
  hasActiveSubscription,
  needsBillingAttention,
} from "@/server/stripe/subscription-utils";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";

type AuthenticatedUser = NonNullable<TRPCInternalContext["_authUser"]>;

export async function createSubscriptionCheckout({
  cancelPath,
  db,
  metadata,
  successPath,
  user,
}: {
  cancelPath: string;
  db: TRPCInternalContext["db"];
  metadata: Record<string, string>;
  successPath: string;
  user: AuthenticatedUser;
}) {
  const baseUrl = getCanonicalBaseUrl();
  const stripe = getStripeClient();
  const billingOption = getDefaultSubscriptionBillingOption();
  let stripeCustomerId = user.stripeCustomerId;

  if (stripeCustomerId) {
    const subscription = await getStripeSubscription(stripeCustomerId);

    if (hasActiveSubscription(subscription.status)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An active subscription already exists for this account.",
      });
    }

    if (needsBillingAttention(subscription.status)) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This account already has a subscription that needs a billing update.",
      });
    }
  }

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create(
      {
        email: user.clerk?.email,
        metadata: {
          userId: user.id,
        },
      },
      { idempotencyKey: `customer:user:${user.id}` },
    );
    stripeCustomerId = customer.id;

    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  // Always bind Checkout to the Customer. Stripe's one-subscription setting
  // handles concurrent sessions.
  const hasMetadata = Object.keys(metadata).length > 0;
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [
      {
        price: requireEnv(
          billingOption.stripePriceEnvironmentVariable,
          env.STRIPE_PRICE_ID,
        ),
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: getStripeTrialPeriodDays(),
      ...(hasMetadata ? { metadata } : {}),
    },
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    metadata: {
      userId: user.id,
      ...metadata,
    },
  });

  if (!session.url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create checkout session",
    });
  }

  return { url: session.url };
}
