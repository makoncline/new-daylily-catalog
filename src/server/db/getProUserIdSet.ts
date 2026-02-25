import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";

interface SubscriptionLookupUser {
  id: string;
  stripeCustomerId: string | null;
}

export async function getProUserIdSet(
  users: SubscriptionLookupUser[],
): Promise<Set<string>> {
  if (users.length === 0) {
    return new Set();
  }

  const resolutionResults = await Promise.all(
    users.map(async (user) => {
      try {
        const subscription = await getStripeSubscription(user.stripeCustomerId);
        return {
          userId: hasActiveSubscription(subscription.status) ? user.id : null,
          failedUserId: null as string | null,
        };
      } catch {
        return {
          userId: null,
          failedUserId: user.id,
        };
      }
    }),
  );

  const failedUserIds = resolutionResults
    .map((result) => result.failedUserId)
    .filter((userId): userId is string => Boolean(userId));

  if (
    failedUserIds.length > 0 &&
    process.env.NODE_ENV !== "test" &&
    process.env.VITEST !== "true"
  ) {
    console.warn("Failed to resolve some subscription statuses for public visibility", {
      failedCount: failedUserIds.length,
      sampleUserIds: failedUserIds.slice(0, 5),
    });
  }

  return new Set(
    resolutionResults
      .map((result) => result.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
}
