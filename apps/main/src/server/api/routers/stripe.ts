import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env, requireEnv } from "@/env";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  hasActiveSubscription,
  needsBillingAttention,
} from "@/server/stripe/subscription-utils";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getStripeClient } from "@/server/stripe/client";
import { z } from "zod";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";

const checkoutSourceSchema = z
  .object({
    conversionId: z.string().uuid(),
    entrySource: z.literal(CATALOG_IMPORTER_ENTRY_SOURCE),
    returnTo: z.literal(CATALOG_IMPORTER_RETURN_PATH),
  })
  .optional();

export const stripeRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    return getStripeSubscription(user.stripeCustomerId);
  }),

  generateCheckout: protectedProcedure
    .input(checkoutSourceSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const baseUrl = getCanonicalBaseUrl();
      const stripe = getStripeClient();

      let stripeCustomerId = user.stripeCustomerId;

      if (stripeCustomerId) {
        const subscription = await getStripeSubscription(stripeCustomerId);

        if (hasActiveSubscription(subscription.status)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An active subscription already exists for this account.",
          });
        }

        if (needsBillingAttention(subscription.status)) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This account already has a subscription that needs a billing update.",
          });
        }
      }

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create(
          {
            email: user.clerk?.email,
            metadata: {
              userId: user.id,
            },
          },
          { idempotencyKey: `customer:user:${user.id}` },
        );
        stripeCustomerId = customer.id;

        await ctx.db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customer.id },
        });
      }

      // Always bind Checkout to the Customer; Stripe's one-subscription setting
      // handles concurrent sessions: https://github.com/t3dotgg/stripe-recommendations
      const successPath = input
        ? `/subscribe/success?redirect=${encodeURIComponent(CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH)}`
        : "/subscribe/success";
      const cancelPath = input?.returnTo ?? "/dashboard";
      const sourceMetadata: Record<string, string> = input
        ? {
            conversion_id: input.conversionId,
            entry_source: input.entrySource,
          }
        : {};
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [
          {
            price: requireEnv("STRIPE_PRICE_ID", env.STRIPE_PRICE_ID),
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
          ...(input ? { metadata: sourceMetadata } : {}),
        },
        success_url: `${baseUrl}${successPath}`,
        cancel_url: `${baseUrl}${cancelPath}`,
        metadata: {
          userId: user.id,
          ...sourceMetadata,
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
