import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getStripeClient } from "@/server/stripe/client";
import { createSubscriptionCheckout } from "@/server/stripe/create-subscription-checkout";

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    return getStripeSubscription(user.stripeCustomerId);
  }),

  generateCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    return createSubscriptionCheckout({
      cancelPath: "/dashboard",
      db: ctx.db,
      metadata: { source: "dashboard" },
      successPath: "/subscribe/success",
      user: ctx.user,
    });
  }),

  getPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;
    const baseUrl = getCanonicalBaseUrl();
    const stripe = getStripeClient();

    if (!user.stripeCustomerId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No billing information found",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/subscribe/success`,
    });

    return { url: session.url };
  }),
});
