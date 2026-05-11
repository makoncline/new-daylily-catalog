import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/server/api/trpc";
import { syncStripeSubscriptionToKV } from "@/server/stripe/sync-subscription";

export const metadata: Metadata = {
  title: "Subscription Updated | Daylily Catalog",
  description: "Your Daylily Catalog subscription has been updated.",
};

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const [authResult, params] = await Promise.all([auth(), searchParams]);
  const { userId } = authResult;
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
  if (params.redirect) {
    redirect(params.redirect);
  }

  redirect("/dashboard");
}
