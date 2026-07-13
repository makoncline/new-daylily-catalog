import type { OutputData } from "@editorjs/editorjs";
import { TRPCError } from "@trpc/server";
import { replicaDb } from "@/server/db";
import { getLatestDate } from "@/server/db/public-date-utils";
import {
  getActiveProUserIdsForUserIds,
  getProUserIds,
} from "@/server/db/getProUserIds";
import {
  isPublicList,
  isPublished,
} from "@/server/db/public-visibility/filters";
import { parseAndSanitizeEditorJsContent } from "@/server/security/editor-js-content";
import { getCloudflareUrlForDaylilyS3Image } from "@/lib/utils/cloudflareLoader";
import {
  type ImageAssetView,
  orderedImageAssetUrlInclude,
  resolveLegacyImagesWithAssets,
} from "@/server/services/image-asset-read-model";

interface PublicSellerImage {
  id: string;
  url: string;
  imageAsset?: ImageAssetView;
}

export interface PublicSellerSummary {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images: PublicSellerImage[];
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicSellerListSummary {
  id: string;
  title: string;
  description: string | null;
  listingCount: number;
}

export interface PublicSellerProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  content: OutputData | string | null;
  location: string | null;
  images: PublicSellerImage[];
  createdAt: Date;
  updatedAt: Date;
  listingCount: number;
  listCount: number;
  _count: {
    listings: number;
  };
  lists: PublicSellerListSummary[];
  hasActiveSubscription: boolean;
}

interface PublicSellerSummaryOptions {
  activeUserIds?: readonly string[] | Set<string>;
}

function parseProfileContent(
  content: string | null,
): OutputData | string | null {
  return parseAndSanitizeEditorJsContent(content);
}

function toActiveUserIdSet(activeUserIds?: readonly string[] | Set<string>) {
  if (!activeUserIds) {
    return null;
  }

  return activeUserIds instanceof Set ? activeUserIds : new Set(activeUserIds);
}

function buildPublicSellerProfile(args: {
  summary: PublicSellerSummary;
  content: OutputData | string | null;
  lists: PublicSellerListSummary[];
}): PublicSellerProfile {
  const { content, lists, summary } = args;

  return {
    id: summary.id,
    title: summary.title,
    slug: summary.slug,
    description: summary.description,
    content,
    location: summary.location,
    images: summary.images,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    listingCount: summary.listingCount,
    listCount: summary.listCount,
    _count: {
      listings: summary.listingCount,
    },
    lists,
    hasActiveSubscription: summary.hasActiveSubscription,
  };
}

export async function getUserIdFromSlugOrId(slugOrId: string): Promise<string> {
  const profile = await replicaDb.userProfile.findFirst({
    where: {
      slug: slugOrId.toLowerCase(),
    },
    select: { userId: true },
  });

  if (profile) {
    return profile.userId;
  }

  const user = await replicaDb.user.findUnique({
    where: { id: slugOrId },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "User not found",
  });
}

export async function getListingIdFromSlugOrId(
  slugOrId: string,
  userId: string,
): Promise<string> {
  const listingBySlug = await replicaDb.listing.findFirst({
    where: {
      userId,
      slug: slugOrId.toLowerCase(),
      ...isPublished(),
    },
    select: { id: true },
  });

  if (listingBySlug) {
    return listingBySlug.id;
  }

  const listingById = await replicaDb.listing.findFirst({
    where: {
      id: slugOrId,
      userId,
      ...isPublished(),
    },
    select: { id: true },
  });

  if (listingById) {
    return listingById.id;
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Listing not found",
  });
}

export async function getPublicSellerSummariesByUserIds(
  userIds: string[],
  options?: PublicSellerSummaryOptions,
  database: typeof replicaDb = replicaDb,
) {
  if (userIds.length === 0) {
    return new Map<string, PublicSellerSummary>();
  }

  const activeUserIdSet = toActiveUserIdSet(options?.activeUserIds);
  const [users, listingAggregates, listAggregates, resolvedActiveUserIds] =
    await Promise.all([
      database.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          createdAt: true,
          profile: {
            select: {
              title: true,
              slug: true,
              description: true,
              location: true,
              updatedAt: true,
              images: {
                select: {
                  id: true,
                  url: true,
                  updatedAt: true,
                },
                orderBy: {
                  order: "asc",
                },
              },
              imageAssets: orderedImageAssetUrlInclude,
            },
          },
        },
      }),
      database.listing.groupBy({
        by: ["userId"],
        where: {
          userId: {
            in: userIds,
          },
          ...isPublished(),
        },
        _count: {
          _all: true,
        },
        _max: {
          updatedAt: true,
        },
      }),
      database.list.groupBy({
        by: ["userId"],
        where: {
          userId: {
            in: userIds,
          },
          ...isPublicList(),
        },
        _count: {
          _all: true,
        },
        _max: {
          updatedAt: true,
        },
      }),
      activeUserIdSet
        ? Promise.resolve(null)
        : getActiveProUserIdsForUserIds(userIds, database),
    ]);

  const activeUserIds = activeUserIdSet ?? new Set(resolvedActiveUserIds ?? []);
  const listingAggregateByUserId = new Map(
    listingAggregates.map((aggregate) => [aggregate.userId, aggregate]),
  );
  const listAggregateByUserId = new Map(
    listAggregates.map((aggregate) => [aggregate.userId, aggregate]),
  );

  return new Map(
    users.map((user) => {
      const listingAggregate = listingAggregateByUserId.get(user.id);
      const listAggregate = listAggregateByUserId.get(user.id);

      return [
        user.id,
        {
          id: user.id,
          title: user.profile?.title ?? null,
          slug: user.profile?.slug ?? null,
          description: user.profile?.description ?? null,
          location: user.profile?.location ?? null,
          images: resolveLegacyImagesWithAssets({
            images: user.profile?.images ?? [],
            imageAssets: user.profile?.imageAssets ?? [],
            variant: "display",
          }).map((image) => ({
            ...image,
            url: getCloudflareUrlForDaylilyS3Image(image.url),
          })),
          listingCount: listingAggregate?._count._all ?? 0,
          listCount: listAggregate?._count._all ?? 0,
          hasActiveSubscription: activeUserIds.has(user.id),
          createdAt: user.createdAt,
          updatedAt: getLatestDate(
            [
              user.profile?.updatedAt,
              ...(user.profile?.images.map((image) => image.updatedAt) ?? []),
              listAggregate?._max.updatedAt,
              listingAggregate?._max.updatedAt,
            ],
            user.createdAt,
          ),
        } satisfies PublicSellerSummary,
      ];
    }),
  );
}

export async function getPublicSellerSummary(
  userId: string,
  options?: PublicSellerSummaryOptions,
) {
  const summaries = await getPublicSellerSummariesByUserIds([userId], options);
  const summary = summaries.get(userId);

  if (!summary) {
    throw new Error("Public seller summary not found");
  }

  return summary;
}

async function getPublicSellerListSummariesByUserIds(userIds: string[]) {
  const grouped = new Map<string, PublicSellerListSummary[]>();

  if (userIds.length === 0) {
    return grouped;
  }

  const rows = await replicaDb.list.findMany({
    where: {
      ...isPublicList(),
      userId: {
        in: userIds,
      },
    },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      _count: {
        select: {
          listings: {
            where: isPublished(),
          },
        },
      },
    },
    orderBy: [
      {
        listings: {
          _count: "desc",
        },
      },
      {
        title: "asc",
      },
    ],
  });

  rows.forEach((row) => {
    const summaries = grouped.get(row.userId) ?? [];
    summaries.push({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      listingCount: row._count.listings,
    });
    grouped.set(row.userId, summaries);
  });

  return grouped;
}

export async function getPublicSellerListSummaries(userId: string) {
  const grouped = await getPublicSellerListSummariesByUserIds([userId]);
  return grouped.get(userId) ?? [];
}

export async function getPublicSellerContent(userId: string) {
  const profile = await replicaDb.userProfile.findUnique({
    where: {
      userId,
    },
    select: {
      content: true,
    },
  });

  return parseProfileContent(profile?.content ?? null);
}

export async function getPublicProfile(userSlugOrId: string) {
  const userId = await getUserIdFromSlugOrId(userSlugOrId);
  const [summary, content, lists] = await Promise.all([
    getPublicSellerSummary(userId),
    getPublicSellerContent(userId),
    getPublicSellerListSummaries(userId),
  ]);

  return buildPublicSellerProfile({
    summary,
    content,
    lists,
  });
}

async function getPublicCatalogCardsByUserIds(
  userIds: string[],
  options?: {
    activeUserIds?: readonly string[] | Set<string>;
  },
) {
  if (userIds.length === 0) {
    return [];
  }

  const summariesByUserId = await getPublicSellerSummariesByUserIds(userIds, {
    activeUserIds: options?.activeUserIds,
  });

  return Array.from(summariesByUserId.values())
    .filter((summary) => summary.listingCount > 0)
    .sort((a, b) => b.listingCount - a.listingCount);
}

export async function getPublicProfiles() {
  const proUserIds = await getProUserIds();

  return getPublicCatalogCardsByUserIds(proUserIds, {
    activeUserIds: proUserIds,
  });
}
