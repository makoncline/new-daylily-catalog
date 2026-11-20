import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { subscriptionBillingOptionSchema } from "@/config/subscription-config";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { getStripeClient } from "@/server/stripe/client";
import {
  getCheckoutSessionBillingOption,
  HOSTED_BILLING_CHOICE,
} from "@/server/stripe/membership-checkout-price";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";

const checkoutSessionIdSchema = z.string().trim().min(1).max(255);

export const claimCatalogImporterCheckoutInputSchema = z
  .object({
    sessionId: checkoutSessionIdSchema,
  })
  .strict();

type AuthenticatedUser = NonNullable<TRPCInternalContext["_authUser"]>;

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  if (
    session.customer &&
    typeof session.customer !== "string" &&
    "email" in session.customer &&
    session.customer.email
  ) {
    return session.customer.email.toLowerCase();
  }

  return (
    session.customer_email?.toLowerCase() ??
    session.metadata?.email?.toLowerCase() ??
    null
  );
}

async function getSubscriptionStatus(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (!session.subscription) {
    return null;
  }

  if (typeof session.subscription !== "string") {
    return session.subscription.status;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  return subscription.status;
}

async function getCheckoutDetails(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });

  if (
    session.metadata?.entry_source !== "catalog_importer" ||
    !session.metadata.import_id
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This checkout link is not valid for catalog import.",
    });
  }

  const customerId = getCustomerId(session.customer);
  const email = getCustomerEmail(session);
  if (!customerId || !email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This checkout is missing your details. Contact support.",
    });
  }

  return {
    session,
    customerId,
    email,
    importId: session.metadata.import_id,
    source: session.metadata.source ?? null,
    status: await getSubscriptionStatus(stripe, session),
  };
}

export async function getCatalogImporterCheckoutStatus(sessionId: string) {
  const details = await getCheckoutDetails(sessionId);

  return {
    sessionId: details.session.id,
    email: details.email,
    isActive: hasActiveSubscription(details.status),
  };
}

export async function claimCatalogImporterCheckout({
  db,
  input,
  user,
}: {
  db: PrismaClient;
  input: z.infer<typeof claimCatalogImporterCheckoutInputSchema>;
  user: AuthenticatedUser;
}) {
  const details = await getCheckoutDetails(input.sessionId);

  if (!hasActiveSubscription(details.status)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Your checkout is not active yet.",
    });
  }

  const clerkEmail = user.clerk?.email?.toLowerCase();
  if (!clerkEmail || clerkEmail !== details.email) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sign in with the email used for checkout.",
    });
  }

  const linkedUser = await db.user.findUnique({
    where: { stripeCustomerId: details.customerId },
    select: { id: true },
  });
  if (linkedUser && linkedUser.id !== user.id) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This checkout is already connected to another account.",
    });
  }

  if (user.stripeCustomerId && user.stripeCustomerId !== details.customerId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This account already has different billing details.",
    });
  }

  if (user.stripeCustomerId !== details.customerId) {
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: details.customerId },
    });
  }

  const activationEvent =
    details.status === "trialing"
      ? "trial_started"
      : details.status === "active"
        ? "paid_activated"
        : null;
  const clerkUserId = user.clerkUserId;
  if (activationEvent && clerkUserId) {
    const metadata = details.session.metadata;
    const billingOption =
      subscriptionBillingOptionSchema.safeParse(metadata?.billing_option)
        .data ??
      (metadata?.billing_choice === HOSTED_BILLING_CHOICE
        ? await getCheckoutSessionBillingOption(details.session).catch(
            () => null,
          )
        : null);
    await captureServerPosthogEvent({
      distinctId: clerkUserId,
      event: activationEvent,
      properties: {
        $insert_id: `catalog-importer:${activationEvent}:${details.session.id}`,
        import_id: details.importId,
        billing_option: billingOption ?? undefined,
        source: details.source ?? "catalog-importer-checkout-claim",
        source_page: "/catalog-importer/checkout/success",
        stripe_customer_id: details.customerId,
        subscription_status: details.status ?? "unknown",
      },
    });
  }

  return { ok: true };
}
