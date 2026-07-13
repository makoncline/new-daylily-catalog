import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { env, requireEnv } from "@/env";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";
import { getCanonicalBaseUrl, getRequestBaseUrl } from "@/lib/utils/getBaseUrl";
import { getStripeClient } from "@/server/stripe/client";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import type { TRPCInternalContext } from "@/server/api/trpc";
import {
  createLocalE2ECheckoutSession,
  getLocalE2ECheckoutDetails,
  isLocalE2ECheckoutEnabled,
} from "./anonymous-onboarding-local-checkout";

const ANONYMOUS_ONBOARDING_FLOW = "anonymous_onboarding";

const emailSchema = z.string().trim().email().max(254).toLowerCase();
const draftIdSchema = z.string().trim().min(1).max(128);
const analyticsDistinctIdSchema = z.string().trim().min(1).max(200).optional();
const checkoutSessionIdSchema = z.string().trim().min(1).max(255);
const leadStageSchema = z.enum(["initial", "pre_checkout_review"]);

export const collectEmailInputSchema = z.object({
  email: emailSchema,
  draftId: draftIdSchema,
  stage: leadStageSchema,
  changed: z.boolean().default(false),
  analyticsDistinctId: analyticsDistinctIdSchema,
});

export const checkoutInputSchema = z.object({
  email: emailSchema,
  draftId: draftIdSchema,
});

export const checkoutStatusInputSchema = z.object({
  sessionId: checkoutSessionIdSchema,
});

export const profileImportInputSchema = z.object({
  gardenName: z.string().trim().max(120).optional().default(""),
});

export const claimCheckoutInputSchema = z.object({
  sessionId: checkoutSessionIdSchema,
  profile: profileImportInputSchema,
});

interface AnonymousCheckoutDetails {
  sessionId: string;
  customerId: string;
  email: string;
  status: string | null;
  created: number;
}

type AuthenticatedUser = NonNullable<TRPCInternalContext["_authUser"]>;
type ProfileImportInput = z.infer<typeof profileImportInputSchema>;

interface PreparedProfileImport {
  profileId: string;
}

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

function accountWasCreatedForCheckout(
  user: AuthenticatedUser,
  checkoutCreatedSeconds: number,
) {
  const clerkCreatedMs = user.clerk?.createdAt;
  if (typeof clerkCreatedMs !== "number" || !Number.isFinite(clerkCreatedMs)) {
    return false;
  }

  return clerkCreatedMs >= checkoutCreatedSeconds * 1000 - 5_000;
}

async function getStripeCheckoutDetails(
  sessionId: string,
): Promise<AnonymousCheckoutDetails> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });

  if (session.metadata?.flow !== ANONYMOUS_ONBOARDING_FLOW) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This checkout link is not valid for setup.",
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
    created:
      typeof session.created === "number" && Number.isFinite(session.created)
        ? session.created
        : Math.floor(Date.now() / 1000),
  };
}

async function getAnonymousCheckoutDetails(
  db: PrismaClient,
  sessionId: string,
) {
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

function hasMeaningfulProfile(profile: {
  title: string | null;
  description: string | null;
  location: string | null;
  images: { id: string }[];
}) {
  return (
    Boolean(profile.title?.trim()) ||
    Boolean(profile.description?.trim()) ||
    Boolean(profile.location?.trim()) ||
    profile.images.length > 0
  );
}

async function prepareProfileImport({
  db,
  userId,
}: {
  db: PrismaClient;
  userId: string;
}) {
  const existingProfile = await db.userProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      images: { select: { id: true }, take: 1 },
    },
  });

  if (existingProfile && hasMeaningfulProfile(existingProfile)) {
    return {
      imported: false,
      preparedImport: null,
    };
  }

  const profileId = existingProfile?.id ?? randomUUID();

  return {
    imported: true,
    preparedImport: { profileId } satisfies PreparedProfileImport,
  };
}

async function applyPreparedProfileImport({
  db,
  preparedImport,
  profile,
  userId,
}: {
  db: Prisma.TransactionClient;
  preparedImport: PreparedProfileImport;
  profile: ProfileImportInput;
  userId: string;
}) {
  await db.userProfile.upsert({
    where: { userId },
    create: {
      id: preparedImport.profileId,
      userId,
      slug: userId,
      title: profile.gardenName || null,
    },
    update: {
      title: profile.gardenName || null,
    },
  });
}

export async function collectAnonymousOnboardingEmailLead(
  input: z.infer<typeof collectEmailInputSchema>,
) {
  await captureServerPosthogEvent({
    distinctId: input.analyticsDistinctId ?? input.draftId,
    event: "onboarding_email_collected",
    properties: {
      draft_id: input.draftId,
      email: input.email,
      email_domain: input.email.split("@")[1]?.toLowerCase() ?? "",
      stage: input.stage,
      changed: input.changed,
      source: ANONYMOUS_ONBOARDING_FLOW,
      flow_version: "real_product_v2",
    },
  });

  return { ok: true };
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

function getAnonymousCheckoutBaseUrl(headers?: Headers | null) {
  const canonicalBaseUrl = getCanonicalBaseUrl();
  const requestBaseUrl = getRequestBaseUrl(headers);

  if (isLocalBaseUrl(canonicalBaseUrl) && isLocalBaseUrl(requestBaseUrl)) {
    return requestBaseUrl;
  }

  return canonicalBaseUrl;
}

export async function createAnonymousOnboardingCheckout({
  db,
  headers,
  input,
}: {
  db: PrismaClient;
  headers?: Headers | null;
  input: z.infer<typeof checkoutInputSchema>;
}) {
  const baseUrl = getAnonymousCheckoutBaseUrl(headers);

  if (isLocalE2ECheckoutEnabled()) {
    const session = await createLocalE2ECheckoutSession({
      db,
      email: input.email,
    });

    return {
      url: `${baseUrl}/onboarding/checkout/success?session_id=${encodeURIComponent(
        session.sessionId,
      )}`,
    };
  }

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
        flow: ANONYMOUS_ONBOARDING_FLOW,
        draftId: input.draftId,
        email: input.email,
      },
    },
    success_url: `${baseUrl}/onboarding/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/onboarding`,
    metadata: {
      flow: ANONYMOUS_ONBOARDING_FLOW,
      draftId: input.draftId,
      email: input.email,
    },
    client_reference_id: input.draftId,
  });

  if (!session.url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not start checkout. Please try again.",
    });
  }

  return { url: session.url };
}

export async function getAnonymousOnboardingCheckoutStatus(
  db: PrismaClient,
  sessionId: string,
) {
  const details = await getAnonymousCheckoutDetails(db, sessionId);

  return {
    sessionId: details.sessionId,
    email: details.email,
    status: details.status,
    isActive: hasActiveSubscription(details.status),
  };
}

export async function claimAnonymousOnboardingCheckout({
  db,
  input,
  user,
}: {
  db: PrismaClient;
  input: z.infer<typeof claimCheckoutInputSchema>;
  user: AuthenticatedUser;
}) {
  const details = await getAnonymousCheckoutDetails(db, input.sessionId);

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

  const shouldImportProfile = accountWasCreatedForCheckout(
    user,
    details.created,
  );
  const profileImport = shouldImportProfile
    ? await prepareProfileImport({
        db,
        userId: user.id,
      })
    : ({
        imported: false,
        preparedImport: null,
      } as const);

  await db.$transaction(async (tx) => {
    if (user.stripeCustomerId !== details.customerId) {
      await tx.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: details.customerId },
      });
    }

    if (!profileImport.preparedImport) {
      return;
    }

    await applyPreparedProfileImport({
      db: tx,
      preparedImport: profileImport.preparedImport,
      profile: input.profile,
      userId: user.id,
    });
  });

  // Account setup must not depend on an observability network request.
  void captureServerPosthogEvent({
    distinctId: user.clerkUserId ?? user.id,
    event: "onboarding_completed",
    properties: {
      source: ANONYMOUS_ONBOARDING_FLOW,
      flow_version: "real_product_v2",
      imported_profile: profileImport.imported,
    },
  });

  return {
    ok: true,
    importedProfile: profileImport.imported,
  };
}
