"use server";

import type { OutputData } from "@editorjs/editorjs";
import { db } from "@/server/db";
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

interface PublicSellerSummaryOptions {
  activeUserIds?: readonly string[] | Set<string>;
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function getLatestDate(
  dates: Array<Date | string | null | undefined>,
  fallback: Date | string,
) {
  const timestamps = dates
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  const fallbackDate = toDate(fallback) ?? new Date(0);

  if (timestamps.length === 0) {
    return fallbackDate;
  }

  return new Date(Math.max(...timestamps));
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

  const activeUserIds =
    activeUserIdSet ?? new Set(resolvedActiveUserIds ?? []);

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
