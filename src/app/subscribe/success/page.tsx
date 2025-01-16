"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/server/api/trpc";
import { syncStripeSubscriptionToKV } from "@/server/stripe/sync-subscription";

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  // Get the current user with their stripeCustomerId
  const user = await getUserByClerkId(userId);
  if (!user?.stripeCustomerId) {
    console.error("No Stripe customer ID found for user", userId);
    redirect("/dashboard");
  }

  // Sync the subscription data
  await syncStripeSubscriptionToKV(user.stripeCustomerId);

  // If there's a redirect URL, go there, otherwise go to dashboard
  if (searchParams.redirect) {
    redirect(searchParams.redirect);
  }

  redirect("/dashboard");
}
