import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { db } from "@/server/db";

interface StripeSubscriptionCache {
  status?: string | null;
}

const getStripeCustomerKey = (customerId: string) =>
  `stripe:customer:${customerId}`;

interface SubscriptionLookupUser {
  id: string;
  stripeCustomerId: string | null;
}

export async function getProUserIdSet(
  users: SubscriptionLookupUser[],
): Promise<Set<string>> {
  const usersWithCustomerId = users.filter(
    (user): user is SubscriptionLookupUser & { stripeCustomerId: string } =>
      Boolean(user.stripeCustomerId),
  );

  if (usersWithCustomerId.length === 0) {
    return new Set();
  }

  const records = await db.keyValue.findMany({
    where: {
      key: {
        in: usersWithCustomerId.map((user) =>
          getStripeCustomerKey(user.stripeCustomerId),
        ),
      },
    },
    select: {
      key: true,
      value: true,
    },
  });
  const subscriptionByKey = new Map(
    records.map((record) => [
      record.key,
      JSON.parse(record.value) as StripeSubscriptionCache,
    ]),
  );

  return new Set(
    usersWithCustomerId
      .filter((user) => {
        const subscription = subscriptionByKey.get(
          getStripeCustomerKey(user.stripeCustomerId),
        );

        return hasActiveSubscription(subscription?.status);
      })
      .map((user) => user.id),
  );
}
