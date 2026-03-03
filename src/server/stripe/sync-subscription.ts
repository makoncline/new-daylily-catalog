import { stripe as appStripe } from "@/server/stripe/client";
import { kvStore as appKvStore } from "@/server/db/kvStore";
import type Stripe from "stripe";
import { tryCatch } from "@/lib/utils";
import { reportError } from "@/lib/error-utils";

export const DEFAULT_SUB_DATA = { status: "none" } as const;

export const getStripeCustomerKey = (customerId: string) =>
  `stripe:customer:${customerId}`;

export async function syncStripeSubscriptionToKVBase(
  customerId: string,
  stripe: Stripe,
  kvStore: typeof appKvStore,
) {
  // Fetch all subscriptions for this customer from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    const subData = DEFAULT_SUB_DATA;
    await kvStore.set(getStripeCustomerKey(customerId), subData);
    return subData;
  }
  // If a user can have multiple subscriptions, that's your problem
  const subscription = subscriptions.data[0]!;
  const subscriptionItem = subscription.items.data[0]!;
  const subscriptionWithPeriods = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
    current_period_start?: number | null;
  };

  // Store complete subscription state
  const subData = {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: subscriptionItem.price.id ?? null,
    currentPeriodEnd:
      subscriptionWithPeriods.current_period_end ??
      subscriptionItem.current_period_end,
    currentPeriodStart:
      subscriptionWithPeriods.current_period_start ??
      subscriptionItem.current_period_start,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== "string"
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };

  // Store the data in your KV
  await kvStore.set(getStripeCustomerKey(customerId), subData);
  return subData;
}

// Wrapper that uses app's default clients
export async function syncStripeSubscriptionToKV(customerId: string) {
  return syncStripeSubscriptionToKVBase(customerId, appStripe, appKvStore);
}

export const getStripeSubscription = async (
  stripeCustomerId: string | null | undefined,
) => {
  if (!stripeCustomerId) {
    return DEFAULT_SUB_DATA;
  }

  // Try to get from cache first
  const cachedData: StripeSubCache | null = await appKvStore.get(
    getStripeCustomerKey(stripeCustomerId),
  );

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, sync from Stripe and cache it
  const result = await tryCatch(syncStripeSubscriptionToKV(stripeCustomerId));
  if (result.error) {
    reportError({
      error: new Error(
        `Error fetching stripe subscription for user ${stripeCustomerId}. ${result.error}`,
      ),
      context: {
        source: "getStripeSubscription",
        stripeCustomerId,
      },
    });
    return DEFAULT_SUB_DATA;
  }
  return result.data;
};

export type StripeSubCache = Awaited<
  ReturnType<typeof syncStripeSubscriptionToKV>
>;
