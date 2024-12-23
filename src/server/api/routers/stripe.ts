import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/server/stripe/client";
import { TRPCError } from "@trpc/server";

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return {
      subscription: ctx.user.stripeSubscription,
      email: ctx.user.email,
      id: ctx.user.id,
    };
  }),

  getSubscriptionLink: protectedProcedure.mutation(async ({ ctx }) => {
    return {
      url: `https://buy.stripe.com/28o9DFdmy9SbaWceUU?prefilled_email=${encodeURIComponent(
        ctx.user.email,
      )}&client_reference_id=${encodeURIComponent(ctx.user.id)}`,
    };
  }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user has an active subscription
    if (!ctx.user.stripeSubscription) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No active subscription found",
      });
    }

    // Use existing Stripe customer or create a new one
    let stripeCustomer = ctx.user.stripeCustomer;

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        metadata: { userId: ctx.user.id },
      });

      stripeCustomer = await ctx.db.stripeCustomer.create({
        data: {
          id: customer.id,
          userId: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.username,
        },
      });
    }

    // Create Stripe portal session
    const { url } = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return { url };
  }),
});
