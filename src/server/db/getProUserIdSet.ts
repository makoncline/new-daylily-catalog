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

  const dedupedUsers = Array.from(new Map(users.map((user) => [user.id, user])).values());

  const statuses = await Promise.all(
    dedupedUsers.map(async (user) => {
      try {
        const subscription = await getStripeSubscription(user.stripeCustomerId);
        return hasActiveSubscription(subscription.status) ? user.id : null;
      } catch (error) {
        console.error("Failed to resolve subscription status for public visibility:", {
          userId: user.id,
          error,
        });
        return null;
      }
    }),
  );

  return new Set(statuses.filter((userId): userId is string => Boolean(userId)));
}
