"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/server/api/trpc";
import { syncStripeSubscriptionToKV } from "@/server/stripe/sync-subscription";

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const params = await searchParams;

  // Get the current user with their stripeCustomerId
  const user = await getUserByClerkId(userId);
  if (!user?.stripeCustomerId) {
    console.error("No Stripe customer ID found for user", userId);
    redirect("/dashboard");
  }

  // Sync the subscription data
  await syncStripeSubscriptionToKV(user.stripeCustomerId);
  // TODO(invalidation): invalidate public caches that depend on pro status after checkout success sync.

  // If there's a redirect URL, go there, otherwise go to dashboard
  if (params.redirect) {
    redirect(params.redirect);
  }

  redirect("/dashboard");
}
