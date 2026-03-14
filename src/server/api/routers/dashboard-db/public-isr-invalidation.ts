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

interface ApplyPublicInvalidationReferencesInput {
  db: PrismaClient;
  extraPaths?: RevalidatePathInput[];
  references: PublicInvalidationReference[];
  requestUrl?: string;
}

interface RevalidatePathInput {
  path: string;
  type?: "page" | "layout";
}

interface RevalidateTagInput {
  profile?: "expire:0" | "max";
  tag: string;
}

interface PublicUserRouteTarget {
  slug: string;
  userId: string;
}

interface ResolvedPublicInvalidationTargets {
  paths: RevalidatePathInput[];
  tags: RevalidateTagInput[];
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

function safeRevalidatePath(path: string, type?: "page" | "layout"): void {
  try {
    if (type) {
      revalidatePath(path, type);
      trackPublicIsrPathInvalidation({
        path,
        sourcePage: "server:dashboard-db.public-isr-invalidation",
        transport: "direct",
        triggerSource: PUBLIC_ISR_INVALIDATION_SOURCE,
        type,
      });
      return;
    }

    revalidatePath(path);
    trackPublicIsrPathInvalidation({
      path,
      sourcePage: "server:dashboard-db.public-isr-invalidation",
      transport: "direct",
      triggerSource: PUBLIC_ISR_INVALIDATION_SOURCE,
    });
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return;
    }

    throw error;
  }
}

function toNextTagProfile(profile: RevalidateTagInput["profile"]) {
  if (profile === "max") {
    return "max";
  }

  return { expire: 0 } as const;
}

function safeRevalidateTag(
  tag: string,
  profile: RevalidateTagInput["profile"] = "expire:0",
): void {
  try {
    revalidateTag(tag, toNextTagProfile(profile));
    trackPublicIsrTagInvalidation({
      profile: profile ?? "expire:0",
      sourcePage: "server:dashboard-db.public-isr-invalidation",
      tag,
      transport: "direct",
      triggerSource: PUBLIC_ISR_INVALIDATION_SOURCE,
    });
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return;
    }

    throw error;
  }
}

function toUniquePathInputs(
  paths: RevalidatePathInput[],
): RevalidatePathInput[] {
  const byKey = new Map<string, RevalidatePathInput>();

  paths.forEach((entry) => {
    const key = `${entry.type ?? "default"}:${entry.path}`;
    byKey.set(key, entry);
  });

  return Array.from(byKey.values());
}

function toUniqueTagInputs(tags: RevalidateTagInput[]): RevalidateTagInput[] {
  return Array.from(
    new Map(
      tags.map((entry) => [`${entry.profile ?? "max"}:${entry.tag}`, entry]),
    ).values(),
  );
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
  paths: RevalidatePathInput[];
  tags?: RevalidateTagInput[];
}): Promise<void> {
  const uniquePaths = toUniquePathInputs(args.paths);
  const uniqueTags = toUniqueTagInputs(args.tags ?? []);

  uniqueTags.forEach((entry) => {
    safeRevalidateTag(entry.tag, entry.profile);
  });

  uniquePaths.forEach((entry) => {
    safeRevalidatePath(entry.path, entry.type);
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
  paths: RevalidatePathInput[];
  requestUrl: string;
  tags?: RevalidateTagInput[];
}) {
  const uniquePaths = toUniquePathInputs(args.paths);
  const uniqueTags = toUniqueTagInputs(args.tags ?? []);
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
      source: PUBLIC_ISR_INVALIDATION_SOURCE,
      paths: uniquePaths,
      tags: uniqueTags,
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
  pathsToRevalidate: RevalidatePathInput[],
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
  const paths: RevalidatePathInput[] = [];
  const tags: RevalidateTagInput[] = [
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
  const paths: RevalidatePathInput[] = [];

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
  const extraPaths = toUniquePathInputs(input.extraPaths ?? []);
  if (references.length === 0 && extraPaths.length === 0) {
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

  const paths = [...targets.paths, ...extraPaths];
  const tags = targets.tags;

  if (shouldUseInternalRouteRevalidation(input.requestUrl)) {
    try {
      await applyPublicCacheRevalidationsViaRoute({
        paths,
        requestUrl: input.requestUrl!,
        tags,
      });
      return;
    } catch (error) {
      console.error("Falling back to direct public cache revalidation", error);
    }
  }

  await applyPublicCacheRevalidations({ paths, tags });
}
