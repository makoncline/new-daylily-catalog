import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/server/stripe/client";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import { z } from "zod";
import {
  syncStripeSubscriptionToKV,
  getStripeSubscription,
} from "@/server/stripe/sync-subscription";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    return getStripeSubscription(user.stripeCustomerId);
  }),

  // Generate checkout session for new subscription
  generateCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    let stripeCustomerId = user.stripeCustomerId;

    if (stripeCustomerId) {
      const subscription = await getStripeSubscription(stripeCustomerId);

      if (hasActiveSubscription(subscription.status)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active subscription already exists for this account.",
        });
      }
    }

    // Create a new Stripe customer if one doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.clerk?.email,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Store the customer-user relationship in database
      await ctx.db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${getBaseUrl()}/subscribe/success`,
      cancel_url: `${getBaseUrl()}/dashboard`,
      metadata: {
        userId: user.id,
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

  // Get customer portal session for managing subscription
  getPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    if (!user.stripeCustomerId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No billing information found",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getBaseUrl()}/dashboard`,
    });

    return { url: session.url };
  }),

  // Sync Stripe data to KV store
  syncStripeData: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.stripeCustomerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No billing information found",
        });
      }

      if (ctx.user.stripeCustomerId !== input.customerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only sync Stripe data for your own account.",
        });
      }

      const subscription = await syncStripeSubscriptionToKV(
        ctx.user.stripeCustomerId,
      );
      return subscription;
    }),
});
