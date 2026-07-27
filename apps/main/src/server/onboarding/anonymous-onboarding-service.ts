import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { env, requireEnv } from "@/env";
import { MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH } from "@/lib/onboarding/anonymous-onboarding-draft";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";
import { getCanonicalBaseUrl, getRequestBaseUrl } from "@/lib/utils/getBaseUrl";
import { getStripeClient } from "@/server/stripe/client";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import {
  areImageAssetUploadsConfigured,
  buildOriginalImageAssetKey,
  buildR2PublicUrl,
  uploadR2ImageBuffer,
} from "@/server/services/image-asset-storage";
import { scheduleImageAssetVariantProcessing } from "@/server/services/image-asset-scheduler";
import {
  areLegacyImageUploadsConfigured,
  buildLegacyImageKey,
  getLegacyImageUrl,
  uploadLegacyImageBuffer,
} from "@/server/services/legacy-image-storage";
import { createUserImageRecord } from "@/server/services/user-image-records";
import { getSupportedImageContentType } from "@/types/image";
import type { TRPCInternalContext } from "@/server/api/trpc";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";
import {
  createLocalE2ECheckoutSession,
  getLocalE2ECheckoutDetails,
  isLocalE2ECheckoutEnabled,
} from "./anonymous-onboarding-local-checkout";

const ANONYMOUS_ONBOARDING_FLOW = "anonymous_onboarding";

const emailSchema = z.string().trim().email().max(254).toLowerCase();
const draftIdSchema = z.string().trim().min(1).max(128);
const checkoutSessionIdSchema = z.string().trim().min(1).max(255);
const leadStageSchema = z.enum(["initial", "pre_checkout_review"]);

export const collectEmailInputSchema = z.object({
  email: emailSchema,
  draftId: draftIdSchema,
  stage: leadStageSchema,
  changed: z.boolean().default(false),
});

export const checkoutInputSchema = z
  .object({
    conversionId: z.string().uuid().optional(),
    email: emailSchema,
    draftId: draftIdSchema,
    entrySource: z.literal(CATALOG_IMPORTER_ENTRY_SOURCE).optional(),
    returnTo: z.literal(CATALOG_IMPORTER_RETURN_PATH).optional(),
  })
  .superRefine((input, context) => {
    const sourceFieldCount = [
      input.conversionId,
      input.entrySource,
      input.returnTo,
    ].filter(Boolean).length;
    if (sourceFieldCount !== 0 && sourceFieldCount !== 3) {
      context.addIssue({
        code: "custom",
        message: "Checkout source fields must be provided together.",
      });
    }
  });

export const checkoutStatusInputSchema = z.object({
  sessionId: checkoutSessionIdSchema,
});

export const profileImportInputSchema = z.object({
  gardenName: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().max(1_000).optional().default(""),
  profileImageDataUrl: z
    .string()
    .max(MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH)
    .nullable()
    .optional()
    .default(null),
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
  entrySource: string | null;
  returnTo: string | null;
}

type AuthenticatedUser = NonNullable<TRPCInternalContext["_authUser"]>;
type ProfileImportInput = z.infer<typeof profileImportInputSchema>;

interface PreparedImportedImage {
  imageId: string;
  url: string;
  status: string;
  r2Original: {
    key: string;
    url: string;
  } | null;
}

interface PreparedProfileImport {
  profileId: string;
  image: PreparedImportedImage | null;
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
    entrySource: session.metadata?.entry_source ?? null,
    returnTo:
      session.metadata?.return_to === CATALOG_IMPORTER_RETURN_PATH
        ? CATALOG_IMPORTER_RETURN_PATH
        : null,
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

function parseImageDataUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match =
    /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(value);
  if (!match) {
    return null;
  }

  const normalizedContentType =
    match[1]?.toLowerCase() === "image/jpg" ? "image/jpeg" : match[1];
  const contentType = getSupportedImageContentType(normalizedContentType);
  if (!contentType) {
    return null;
  }

  return {
    contentType,
    buffer: Buffer.from(match[2] ?? "", "base64"),
  };
}

async function prepareImportedProfileImage(args: {
  dataUrl: string | null | undefined;
  profileId: string;
  userId: string;
}): Promise<PreparedImportedImage | null> {
  const parsed = parseImageDataUrl(args.dataUrl);
  if (!parsed) {
    return null;
  }

  const imageId = randomUUID();

  if (isLocalE2ECheckoutEnabled()) {
    return {
      imageId,
      url: args.dataUrl!,
      status: "onboarding-import-local-e2e",
      r2Original: null,
    };
  }

  if (!areLegacyImageUploadsConfigured()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not save your profile image. Please try again.",
    });
  }

  const legacyKey = buildLegacyImageKey({
    contentType: parsed.contentType,
    fileId: randomBytes(16).toString("hex"),
    referenceId: args.profileId,
    userId: args.userId,
  });
  await uploadLegacyImageBuffer({
    body: parsed.buffer,
    contentType: parsed.contentType,
    key: legacyKey,
  });

  let r2Original: PreparedImportedImage["r2Original"] = null;
  if (areImageAssetUploadsConfigured()) {
    const r2Key = buildOriginalImageAssetKey({
      kind: "profile",
      userId: args.userId,
      imageAssetId: imageId,
      contentType: parsed.contentType,
    });
    await uploadR2ImageBuffer({
      body: parsed.buffer,
      contentType: parsed.contentType,
      key: r2Key,
    });
    r2Original = {
      key: r2Key,
      url: buildR2PublicUrl(r2Key),
    };
  }

  return {
    imageId,
    url: getLegacyImageUrl(legacyKey),
    status: "onboarding-import",
    r2Original,
  };
}

async function prepareProfileImport({
  db,
  profile,
  userId,
}: {
  db: PrismaClient;
  profile: ProfileImportInput;
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
  const shouldImportImage =
    profile.profileImageDataUrl && (existingProfile?.images.length ?? 0) === 0;
  const image = shouldImportImage
    ? await prepareImportedProfileImage({
        dataUrl: profile.profileImageDataUrl,
        profileId,
        userId,
      })
    : null;

  return {
    imported: true,
    preparedImport: { profileId, image } satisfies PreparedProfileImport,
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
  const importedProfile = await db.userProfile.upsert({
    where: { userId },
    create: {
      id: preparedImport.profileId,
      userId,
      slug: userId,
      title: profile.gardenName || null,
      location: profile.location || null,
      description: profile.description || null,
    },
    update: {
      title: profile.gardenName || null,
      location: profile.location || null,
      description: profile.description || null,
    },
    select: { id: true },
  });

  if (!preparedImport.image) {
    return null;
  }

  const createdImage = await createUserImageRecord({
    db,
    imageId: preparedImport.image.imageId,
    order: 0,
    owner: { type: "profile", referenceId: importedProfile.id },
    r2OriginalKey: preparedImport.image.r2Original?.key,
    r2OriginalUrl: preparedImport.image.r2Original?.url,
    status: preparedImport.image.status,
    url: preparedImport.image.url,
  });

  return preparedImport.image.r2Original ? createdImage.id : null;
}

export async function collectAnonymousOnboardingEmailLead(
  input: z.infer<typeof collectEmailInputSchema>,
) {
  await captureServerPosthogEvent({
    distinctId: input.draftId,
    event: "onboarding_email_collected",
    properties: {
      draftId: input.draftId,
      email: input.email,
      emailDomain: input.email.split("@")[1]?.toLowerCase() ?? "",
      stage: input.stage,
      changed: input.changed,
      source: ANONYMOUS_ONBOARDING_FLOW,
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
  const isCatalogImporterCheckout =
    input.entrySource === CATALOG_IMPORTER_ENTRY_SOURCE &&
    input.returnTo === CATALOG_IMPORTER_RETURN_PATH &&
    Boolean(input.conversionId);
  const sourceMetadata: Record<string, string> = isCatalogImporterCheckout
    ? {
        conversion_id: input.conversionId!,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        return_to: CATALOG_IMPORTER_RETURN_PATH,
      }
    : {};

  if (isLocalE2ECheckoutEnabled()) {
    const session = await createLocalE2ECheckoutSession({
      db,
      email: input.email,
      entrySource: isCatalogImporterCheckout
        ? CATALOG_IMPORTER_ENTRY_SOURCE
        : null,
      returnTo: isCatalogImporterCheckout ? CATALOG_IMPORTER_RETURN_PATH : null,
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
        ...sourceMetadata,
      },
    },
    success_url: `${baseUrl}/onboarding/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${isCatalogImporterCheckout ? CATALOG_IMPORTER_RETURN_PATH : "/onboarding"}`,
    metadata: {
      flow: ANONYMOUS_ONBOARDING_FLOW,
      draftId: input.draftId,
      email: input.email,
      ...sourceMetadata,
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
    entrySource: details.entrySource,
    returnTo: details.returnTo,
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

  const shouldImportProfile =
    details.entrySource !== CATALOG_IMPORTER_ENTRY_SOURCE &&
    accountWasCreatedForCheckout(user, details.created);
  const profileImport = shouldImportProfile
    ? await prepareProfileImport({
        db,
        profile: input.profile,
        userId: user.id,
      })
    : ({
        imported: false,
        preparedImport: null,
      } as const);

  const scheduledImageAssetId = await db.$transaction(async (tx) => {
    if (user.stripeCustomerId !== details.customerId) {
      await tx.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: details.customerId },
      });
    }

    if (!profileImport.preparedImport) {
      return null;
    }

    return applyPreparedProfileImport({
      db: tx,
      preparedImport: profileImport.preparedImport,
      profile: input.profile,
      userId: user.id,
    });
  });

  if (scheduledImageAssetId) {
    scheduleImageAssetVariantProcessing({
      db,
      imageAssetId: scheduledImageAssetId,
    });
  }

  return {
    ok: true,
    importedProfile: profileImport.imported,
  };
}
