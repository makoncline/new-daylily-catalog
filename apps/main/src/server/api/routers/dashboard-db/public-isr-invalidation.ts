import type { PrismaClient } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { env, requireEnv } from "@/env";
import {
  getPublicCatalogsTag,
  getPublicCultivarTag,
  getPublicForSaleCountTag,
  getPublicListingCardTag,
  getPublicListingsPageTag,
  getPublicProfileTag,
  getPublicSellerContentTag,
  getPublicSellerListsTag,
} from "@/lib/cache/public-cache-tags";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import {
  trackPublicIsrPathInvalidation,
  trackPublicIsrTagInvalidation,
} from "@/server/analytics/public-isr-posthog";
import type {
  PublicInvalidationReference,
  PublicInvalidationReferenceType,
} from "@/types/public-types";
import {
  createPublicIsrPlan,
  executePublicIsrPlan,
  type PublicIsrPathInput,
  type PublicIsrTagInput,
} from "./public-isr-invalidation-plan";

interface ApplyPublicInvalidationReferencesInput {
  db: PrismaClient;
  extraPaths?: PublicIsrPathInput[];
  references: PublicInvalidationReference[];
  requestUrl?: string;
}

interface PublicUserRouteTarget {
  slug: string;
  userId: string;
}

interface ResolvedPublicInvalidationTargets {
  paths: PublicIsrPathInput[];
  tags: PublicIsrTagInput[];
}

interface ResolveReferenceArgs {
  db: PrismaClient;
  getOrLoadUserTarget: (userId: string) => Promise<PublicUserRouteTarget>;
  reference: PublicInvalidationReference;
}

type InvalidationResolver = (
  args: ResolveReferenceArgs,
) => Promise<ResolvedPublicInvalidationTargets>;

const PUBLIC_ISR_INVALIDATION_SOURCE = "dashboard-db.catalog-mutation";

function shouldIgnoreMissingStaticGenerationStoreError(
  error: unknown,
): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    error instanceof Error &&
    error.message.includes("static generation store missing")
  );
}

function safeRevalidatePath(path: string, type?: "page" | "layout"): boolean {
  try {
    if (type) {
      revalidatePath(path, type);
      return true;
    }

    revalidatePath(path);
    return true;
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return false;
    }

    throw error;
  }
}

function safeRevalidateTag(
  tag: string,
  profile: "max" | { expire: 0 },
): boolean {
  try {
    revalidateTag(tag, profile);
    return true;
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return false;
    }

    throw error;
  }
}

function toUniqueReferences(
  references: PublicInvalidationReference[],
): PublicInvalidationReference[] {
  return Array.from(
    new Map(
      references.map((reference) => [
        `${reference.referenceType}:${reference.referenceId}`,
        reference,
      ]),
    ).values(),
  );
}

async function applyPublicCacheRevalidations(args: {
  paths: PublicIsrPathInput[];
  tags?: PublicIsrTagInput[];
}): Promise<void> {
  const plan = createPublicIsrPlan({
    paths: args.paths,
    source: PUBLIC_ISR_INVALIDATION_SOURCE,
    tags: args.tags ?? [],
  });

  executePublicIsrPlan({
    handlers: {
      revalidatePath: safeRevalidatePath,
      revalidateTag: safeRevalidateTag,
      trackPathInvalidation: trackPublicIsrPathInvalidation,
      trackTagInvalidation: trackPublicIsrTagInvalidation,
    },
    plan,
    sourcePage: "server:dashboard-db.public-isr-invalidation",
    transport: "direct",
  });
}

function shouldUseInternalRouteRevalidation(requestUrl?: string) {
  return process.env.NODE_ENV !== "test" && !!requestUrl;
}

function shouldAttachVercelBypassHeader(url: URL) {
  return (
    !!env.VERCEL_AUTOMATION_BYPASS_SECRET &&
    (url.hostname.endsWith(".vercel.app") ||
      url.hostname.endsWith("-preview.daylilycatalog.com"))
  );
}

async function applyPublicCacheRevalidationsViaRoute(args: {
  paths: PublicIsrPathInput[];
  requestUrl: string;
  tags?: PublicIsrTagInput[];
}) {
  const plan = createPublicIsrPlan({
    paths: args.paths,
    source: PUBLIC_ISR_INVALIDATION_SOURCE,
    tags: args.tags ?? [],
  });
  const routeUrl = new URL("/api/internal/public-cache-revalidate", args.requestUrl);

  const headers = new Headers({
    authorization: `Bearer ${requireEnv(
      "CLERK_WEBHOOK_SECRET",
      env.CLERK_WEBHOOK_SECRET,
    )}`,
    "content-type": "application/json",
  });

  if (shouldAttachVercelBypassHeader(routeUrl)) {
    headers.set(
      "x-vercel-protection-bypass",
      env.VERCEL_AUTOMATION_BYPASS_SECRET!,
    );
    headers.set(
      "x-vercel-set-bypass-cookie",
      env.VERCEL_AUTOMATION_BYPASS_SECRET!,
    );
  }

  const response = await fetch(routeUrl, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      source: plan.source,
      paths: plan.paths,
      tags: plan.tags,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Public cache revalidate route failed with status ${response.status}`,
    );
  }
}

async function getCanonicalSlug(
  db: PrismaClient,
  userId: string,
): Promise<string> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  return profile?.slug ?? userId;
}

async function getUserRouteTarget(
  db: PrismaClient,
  userId: string,
): Promise<PublicUserRouteTarget> {
  return {
    slug: await getCanonicalSlug(db, userId),
    userId,
  };
}

function addUserRootPaths(
  pathsToRevalidate: PublicIsrPathInput[],
  target: PublicUserRouteTarget,
) {
  pathsToRevalidate.push({ path: `/${target.slug}` });
}

async function resolveListingTarget(
  db: PrismaClient,
  listingId: string,
): Promise<{ cultivarSegment: string | null; userId: string } | null> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      userId: true,
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
    },
  });

  if (!listing) {
    return null;
  }

  return {
    cultivarSegment: toCultivarRouteSegment(
      listing.cultivarReference?.normalizedName,
    ),
    userId: listing.userId,
  };
}

async function resolveCatalogsIndexReference(): Promise<ResolvedPublicInvalidationTargets> {
  return {
    paths: [{ path: "/catalogs" }],
    tags: [{ tag: getPublicCatalogsTag() }],
  };
}

async function resolveCultivarReference(
  args: ResolveReferenceArgs,
): Promise<ResolvedPublicInvalidationTargets> {
  const cultivarSegment = toCultivarRouteSegment(args.reference.referenceId);
  if (!cultivarSegment) {
    return {
      paths: [],
      tags: [],
    };
  }

  return {
    paths: [{ path: `/cultivar/${cultivarSegment}` }],
    tags: [{ tag: getPublicCultivarTag(cultivarSegment) }],
  };
}

async function resolveListingReference(args: {
  db: PrismaClient;
  getOrLoadUserTarget: (userId: string) => Promise<PublicUserRouteTarget>;
  reference: PublicInvalidationReference;
}): Promise<ResolvedPublicInvalidationTargets> {
  const listingTarget = await resolveListingTarget(
    args.db,
    args.reference.referenceId,
  );
  if (!listingTarget) {
    return {
      paths: [],
      tags: [],
    };
  }

  const userTarget = await args.getOrLoadUserTarget(listingTarget.userId);
  const paths: PublicIsrPathInput[] = [];
  const tags: PublicIsrTagInput[] = [
    {
      tag: getPublicListingCardTag(args.reference.referenceId),
    },
  ];

  addUserRootPaths(paths, userTarget);

  if (listingTarget.cultivarSegment) {
    paths.push({
      path: `/cultivar/${listingTarget.cultivarSegment}`,
    });
    tags.push({
      tag: getPublicCultivarTag(listingTarget.cultivarSegment),
    });
  }

  return {
    paths,
    tags,
  };
}

async function resolveSellerReference(args: {
  getOrLoadUserTarget: (userId: string) => Promise<PublicUserRouteTarget>;
  reference: PublicInvalidationReference;
}): Promise<ResolvedPublicInvalidationTargets> {
  const target = await args.getOrLoadUserTarget(args.reference.referenceId);
  const paths: PublicIsrPathInput[] = [];

  addUserRootPaths(paths, target);

  return {
    paths,
    tags: [
      {
        tag: getPublicProfileTag(args.reference.referenceId),
      },
      {
        tag: getPublicSellerContentTag(args.reference.referenceId),
      },
      {
        tag: getPublicSellerListsTag(args.reference.referenceId),
      },
      {
        tag: getPublicListingsPageTag(args.reference.referenceId),
      },
      {
        tag: getPublicForSaleCountTag(args.reference.referenceId),
      },
    ],
  };
}

const INVALIDATION_RESOLVERS: Record<
  PublicInvalidationReferenceType,
  InvalidationResolver
> = {
  "catalogs:index": async () => resolveCatalogsIndexReference(),
  cultivar: resolveCultivarReference,
  listing: resolveListingReference,
  seller: resolveSellerReference,
};

async function resolvePublicInvalidationTargets(args: {
  db: PrismaClient;
  references: PublicInvalidationReference[];
}): Promise<ResolvedPublicInvalidationTargets> {
  const userTargets = new Map<string, PublicUserRouteTarget>();

  async function getOrLoadUserTarget(userId: string) {
    const existing = userTargets.get(userId);
    if (existing) {
      return existing;
    }

    const target = await getUserRouteTarget(args.db, userId);
    userTargets.set(userId, target);
    return target;
  }

  const resolvedTargets = await Promise.all(
    args.references.map(async (reference) => {
      return INVALIDATION_RESOLVERS[reference.referenceType]({
        db: args.db,
        getOrLoadUserTarget,
        reference,
      });
    }),
  );

  return resolvedTargets.reduce<ResolvedPublicInvalidationTargets>(
    (acc, target) => {
      acc.paths.push(...target.paths);
      acc.tags.push(...target.tags);
      return acc;
    },
    { paths: [], tags: [] },
  );
}

export async function invalidatePublicIsrForReferences(
  input: ApplyPublicInvalidationReferencesInput,
): Promise<void> {
  const references = toUniqueReferences(input.references);
  if (references.length === 0 && (input.extraPaths?.length ?? 0) === 0) {
    return;
  }

  const targets =
    references.length > 0
      ? await resolvePublicInvalidationTargets({
          db: input.db,
          references,
        })
      : {
          paths: [],
          tags: [],
        };

  const plan = createPublicIsrPlan({
    paths: [...targets.paths, ...(input.extraPaths ?? [])],
    source: PUBLIC_ISR_INVALIDATION_SOURCE,
    tags: targets.tags,
  });

  if (shouldUseInternalRouteRevalidation(input.requestUrl)) {
    try {
      await applyPublicCacheRevalidationsViaRoute({
        paths: plan.paths,
        requestUrl: input.requestUrl!,
        tags: plan.tags,
      });
      return;
    } catch (error) {
      console.error("Falling back to direct public cache revalidation", error);
    }
  }

  await applyPublicCacheRevalidations({
    paths: plan.paths,
    tags: plan.tags,
  });
}
