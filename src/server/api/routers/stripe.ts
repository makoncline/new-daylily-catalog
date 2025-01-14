import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stripe } from "@/server/stripe/client";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import { z } from "zod";
import { kvStore } from "@/server/db/kvStore";
import {
  syncStripeSubscriptionToKV,
  getStripeCustomerKey,
  DEFAULT_SUB_DATA,
  StripeSubCache,
} from "@/server/stripe/sync-subscription";

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    if (!user?.stripeCustomerId) {
      return DEFAULT_SUB_DATA;
    }

    // Try to get from cache first
    const cachedData = (await kvStore.get(
      getStripeCustomerKey(user.stripeCustomerId),
    )) as StripeSubCache;

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, sync from Stripe and cache it
    return syncStripeSubscriptionToKV(user.stripeCustomerId);
  }),

  // Generate checkout session for new subscription
  generateCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    let stripeCustomerId = user.stripeCustomerId;

    // Create a new Stripe customer if one doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
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
      success_url: `${env.NEXT_PUBLIC_APP_URL}/subscribe/success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
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
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return { url: session.url };
  }),

  // Sync Stripe data to KV store
  syncStripeData: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ input }) => {
      const subscription = await syncStripeSubscriptionToKV(input.customerId);
      return subscription;
    }),
});
