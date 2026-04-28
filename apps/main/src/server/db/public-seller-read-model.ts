import type { OutputData } from "@editorjs/editorjs";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { getLatestDate } from "@/server/db/public-date-utils";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import { isPublished } from "@/server/db/public-visibility/filters";

export interface PublicSellerSummary {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images: Array<{ id: string; url: string }>;
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
  images: Array<{ id: string; url: string }>;
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

function parseProfileContent(content: string | null): OutputData | string | null {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as OutputData;
  } catch (error) {
    console.error("Error parsing profile content:", error);
    return content;
  }
}

function toActiveUserIdSet(activeUserIds?: readonly string[] | Set<string>) {
  if (!activeUserIds) {
    return null;
  }

  return activeUserIds instanceof Set
    ? activeUserIds
    : new Set(activeUserIds);
}

export function buildPublicSellerProfile(args: {
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
  const profile = await db.userProfile.findFirst({
    where: {
      slug: slugOrId.toLowerCase(),
    },
    select: { userId: true },
  });

  if (profile) {
    return profile.userId;
  }

  const user = await db.user.findUnique({
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
  const listingBySlug = await db.listing.findFirst({
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

  const listingById = await db.listing.findFirst({
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
) {
  if (userIds.length === 0) {
    return new Map<string, PublicSellerSummary>();
  }

  const activeUserIdSet = toActiveUserIdSet(options?.activeUserIds);
  const [users, resolvedActiveUserIds] = await Promise.all([
    db.user.findMany({
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
          },
        },
        _count: {
          select: {
            listings: {
              where: isPublished(),
            },
            lists: true,
          },
        },
        lists: {
          select: {
            updatedAt: true,
          },
        },
        listings: {
          where: isPublished(),
          select: {
            updatedAt: true,
          },
        },
      },
    }),
    activeUserIdSet ? Promise.resolve(null) : getCachedProUserIds(),
  ]);

  const activeUserIds = activeUserIdSet ?? new Set(resolvedActiveUserIds ?? []);

  return new Map(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        title: user.profile?.title ?? null,
        slug: user.profile?.slug ?? null,
        description: user.profile?.description ?? null,
        location: user.profile?.location ?? null,
        images:
          user.profile?.images.map((image) => ({
            id: image.id,
            url: image.url,
          })) ?? [],
        listingCount: user._count.listings,
        listCount: user._count.lists,
        hasActiveSubscription: activeUserIds.has(user.id),
        createdAt: user.createdAt,
        updatedAt: getLatestDate(
          [
            user.profile?.updatedAt,
            ...(user.profile?.images.map((image) => image.updatedAt) ?? []),
            ...user.lists.map((list) => list.updatedAt),
            ...user.listings.map((listing) => listing.updatedAt),
          ],
          user.createdAt,
        ),
      } satisfies PublicSellerSummary,
    ]),
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

export async function getPublicSellerListSummariesByUserIds(userIds: string[]) {
  const grouped = new Map<string, PublicSellerListSummary[]>();

  if (userIds.length === 0) {
    return grouped;
  }

  const rows = await db.list.findMany({
    where: {
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
  const profile = await db.userProfile.findUnique({
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
  try {
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
  } catch (error) {
    console.error("Error fetching public profile:", error);

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch public profile",
    });
  }
}

export async function getPublicCatalogCardsByUserIds(
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
  try {
    const proUserIds = await getCachedProUserIds();

    return getPublicCatalogCardsByUserIds(proUserIds, {
      activeUserIds: proUserIds,
    });
  } catch (error) {
    console.error("Error fetching public profiles:", error);
    throw new Error("Failed to fetch public profiles");
  }
}
