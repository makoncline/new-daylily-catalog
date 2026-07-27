import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { env, requireEnv } from "@/env";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH,
  CATALOG_IMPORTER_RETURN_PATH,
  catalogImporterCheckoutSourceSchema,
} from "@/lib/catalog-importer-membership";
import { getCanonicalBaseUrl, getRequestBaseUrl } from "@/lib/utils/getBaseUrl";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { getStripeClient } from "@/server/stripe/client";
import { createSubscriptionCheckout } from "@/server/stripe/create-subscription-checkout";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import {
  createLocalE2ECheckoutSession,
  getLocalE2ECheckoutDetails,
  isLocalE2ECheckoutEnabled,
} from "./local-checkout";

const emailSchema = z.string().trim().email().max(254).toLowerCase();
const checkoutSessionIdSchema = z.string().trim().min(1).max(255);
const LEGACY_ANONYMOUS_ONBOARDING_FLOW = "anonymous_onboarding";

export const catalogImporterCheckoutInputSchema =
  catalogImporterCheckoutSourceSchema.extend({
    email: emailSchema,
  });

export const claimCatalogImporterCheckoutInputSchema = z
  .object({
    sessionId: checkoutSessionIdSchema,
  })
  .strict();

interface CatalogImporterCheckoutDetails {
  sessionId: string;
  customerId: string;
  email: string;
  status: string | null;
}

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

async function getStripeCheckoutDetails(
  sessionId: string,
): Promise<CatalogImporterCheckoutDetails> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });

  const isCatalogImporterCheckout =
    session.metadata?.entry_source === CATALOG_IMPORTER_ENTRY_SOURCE &&
    session.metadata?.return_to === CATALOG_IMPORTER_RETURN_PATH;
  const isLegacyOnboardingCheckout =
    session.metadata?.flow === LEGACY_ANONYMOUS_ONBOARDING_FLOW;

  if (!isCatalogImporterCheckout && !isLegacyOnboardingCheckout) {
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
      message:
        "This checkout is missing your details. Please start checkout again.",
    });
  }

  return {
    sessionId: session.id,
    customerId,
    email,
    status: await getSubscriptionStatus(stripe, session),
  };
}

async function getCheckoutDetails(db: PrismaClient, sessionId: string) {
  if (isLocalE2ECheckoutEnabled()) {
    const localDetails = await getLocalE2ECheckoutDetails(db, sessionId);
    if (localDetails) {
      return localDetails;
    }

    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This local checkout session was not found.",
    });
  }

  return getStripeCheckoutDetails(sessionId);
}

function isLocalBaseUrl(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function getCheckoutBaseUrl(headers?: Headers | null) {
  const canonicalBaseUrl = getCanonicalBaseUrl();
  const requestBaseUrl = getRequestBaseUrl(headers);

  if (isLocalBaseUrl(canonicalBaseUrl) && isLocalBaseUrl(requestBaseUrl)) {
    return requestBaseUrl;
  }

  return canonicalBaseUrl;
}

export async function createCatalogImporterCheckout({
  db,
  headers,
  input,
}: {
  db: PrismaClient;
  headers?: Headers | null;
  input: z.infer<typeof catalogImporterCheckoutInputSchema>;
}) {
  const baseUrl = getCheckoutBaseUrl(headers);

  if (isLocalE2ECheckoutEnabled()) {
    const session = await createLocalE2ECheckoutSession({
      db,
      email: input.email,
    });

    return {
      url: `${baseUrl}/catalog-importer/checkout/success?session_id=${encodeURIComponent(
        session.sessionId,
      )}`,
    };
  }

  const sourceMetadata = {
    conversion_id: input.conversionId,
    entry_source: input.entrySource,
    return_to: input.returnTo,
  };
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    customer_email: input.email,
    mode: "subscription",
    line_items: [
      {
        price: requireEnv("STRIPE_PRICE_ID", env.STRIPE_PRICE_ID),
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS,
      metadata: {
        email: input.email,
        ...sourceMetadata,
      },
    },
    success_url: `${baseUrl}/catalog-importer/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${CATALOG_IMPORTER_RETURN_PATH}`,
    metadata: {
      email: input.email,
      ...sourceMetadata,
    },
    client_reference_id: input.conversionId,
  });

  if (!session.url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not start checkout. Please try again.",
    });
  }

  return { url: session.url };
}

export async function createSignedInCatalogImporterCheckout({
  db,
  input,
  user,
}: {
  db: TRPCInternalContext["db"];
  input: z.infer<typeof catalogImporterCheckoutSourceSchema>;
  user: AuthenticatedUser;
}) {
  const metadata = {
    conversion_id: input.conversionId,
    entry_source: input.entrySource,
  };

  return createSubscriptionCheckout({
    cancelPath: input.returnTo,
    db,
    metadata,
    successPath: `/subscribe/success?redirect=${encodeURIComponent(
      CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH,
    )}`,
    user,
  });
}

export async function getCatalogImporterCheckoutStatus(
  db: PrismaClient,
  sessionId: string,
) {
  const details = await getCheckoutDetails(db, sessionId);

  return {
    sessionId: details.sessionId,
    email: details.email,
    status: details.status,
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
  const details = await getCheckoutDetails(db, input.sessionId);

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

  return { ok: true };
}
