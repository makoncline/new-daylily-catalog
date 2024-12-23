import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/server/stripe/client";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      include: {
        stripeSubscription: true,
        stripeCustomer: true,
      },
    });

    return {
      subscription: user.stripeSubscription,
      email: user.email,
      id: user.id,
    };
  }),

  getSubscriptionLink: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      include: {
        stripeCustomer: true,
        stripeSubscription: true,
      },
    });

    // Check if user already has an active subscription
    if (
      user.stripeSubscription?.status === "active" ||
      user.stripeSubscription?.status === "trialing"
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "You already have an active subscription",
      });
    }

    // Check if user already has a Stripe customer
    let stripeCustomer = user.stripeCustomer;

    if (!stripeCustomer) {
      // Create new customer if one doesn't exist
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      stripeCustomer = await ctx.db.stripeCustomer.create({
        data: {
          id: customer.id,
          userId: user.id,
          email: user.email,
          name: user.username,
        },
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${env.NEXT_PUBLIC_APP_URL}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}`,
      subscription_data: {
        trial_settings: {
          end_behavior: {
            missing_payment_method: "cancel",
          },
        },
        metadata: {
          userId: user.id,
        },
      },
    });

    if (!session.url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      });
    }

    return { url: session.url };
  }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      include: {
        stripeSubscription: true,
        stripeCustomer: true,
      },
    });

    // Check if user has an active subscription
    if (
      !user.stripeSubscription ||
      (user.stripeSubscription.status !== "active" &&
        user.stripeSubscription.status !== "trialing")
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No active subscription found",
      });
    }

    if (!user.stripeCustomer) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No Stripe customer found",
      });
    }

    // Create Stripe portal session
    const { url } = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomer.id,
      return_url: `${env.NEXT_PUBLIC_APP_URL}`,
    });

    return { url };
  }),
});
