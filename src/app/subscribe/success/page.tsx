"use server";

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    redirect("/");
  }

  // Get the current user with their stripeCustomerId
  const user = await api.user.getCurrentUser();
  if (!user?.stripeCustomerId) {
    console.error("No Stripe customer ID found for user", userId);
    redirect("/dashboard");
  }

  // Sync the subscription data
  await api.stripe.syncStripeData({
    customerId: user.stripeCustomerId,
  });

  // If there's a redirect URL, go there, otherwise go to dashboard
  if (searchParams.redirect) {
    redirect(searchParams.redirect);
  }

  redirect("/dashboard");
}
