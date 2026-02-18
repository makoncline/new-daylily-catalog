import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { STATUS, TABLE_CONFIG } from "@/config/constants";
import { getUserIdFromSlugOrId } from "./getPublicProfile";
import { getDisplayAhsListing } from "@/lib/utils/ahs-display";
import { Prisma } from "@prisma/client";

const ahsListingSelect = {
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  form: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
  fragrance: true,
  parentage: true,
  color: true,
} as const;

export const listingSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  price: true,
  userId: true,
  user: {
    select: {
      profile: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  },
  lists: {
    select: {
      id: true,
      title: true,
    },
  },
  cultivarReference: {
    select: {
      normalizedName: true,
      ahsListing: {
        select: ahsListingSelect,
      },
    },
  },
  images: {
    select: {
      id: true,
      url: true,
    },
    orderBy: {
      order: "asc",
    },
  },
} as const;

type ListingWithRelations = Prisma.ListingGetPayload<{
  select: typeof listingSelect;
}>;

interface GetListingsArgs {
  userId: string;
  limit: number;
  cursor?: string;
}

const publicListingVisibilityFilter: Prisma.ListingWhereInput = {
  OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
};

async function getSortedPublicListingIds(userId: string) {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Listing"
    WHERE "userId" = ${userId}
      AND ("status" IS NULL OR "status" <> ${STATUS.HIDDEN})
    ORDER BY
      CASE
        WHEN LTRIM("title") GLOB '[A-Za-z]*' THEN 0
        WHEN LTRIM("title") GLOB '[0-9]*' THEN 1
        ELSE 2
      END,
      LTRIM("title") COLLATE NOCASE ASC,
      "id" ASC
  `);

  return rows.map((row) => row.id);
}

async function getListingsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [] as ListingWithRelations[];
  }

  const rows = await db.listing.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: listingSelect,
  });

  const rowById = new Map(rows.map((row) => [row.id, row]));

  return ids
    .map((id) => rowById.get(id))
    .filter((row): row is ListingWithRelations => Boolean(row));
}

export async function getListings(args: GetListingsArgs) {
  const sortedIds = await getSortedPublicListingIds(args.userId);
  const cursorIndex = args.cursor ? sortedIds.indexOf(args.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const pageIds = sortedIds.slice(startIndex, startIndex + args.limit + 1);

  return getListingsByIds(pageIds);
}

// Helper function to transform listings with AHS image fallback
export function transformListings(listings: ListingWithRelations[]) {
  const transformed = listings.map((listing) => {
    const displayAhsListing = getDisplayAhsListing(listing);

    return {
      ...listing,
      ahsListing: displayAhsListing,
      images:
        listing.images.length === 0 && displayAhsListing?.ahsImageUrl
          ? [
              {
                id: `ahs-${listing.id}`,
                url: displayAhsListing.ahsImageUrl,
              },
            ]
          : listing.images,
    };
  });

  return transformed;
}

// Get initial page data - optimized for fast first load
export async function getInitialListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    const items = await getListings({ userId, limit: 36 });

    return transformListings(items);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch initial listings",
      cause: error,
    });
  }
}

interface GetPublicListingsPageArgs {
  userSlugOrId: string;
  page: number;
  pageSize?: number;
}

export async function getPublicListingsPage({
  userSlugOrId,
  page,
  pageSize = TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
}: GetPublicListingsPageArgs) {
  const userId = await getUserIdFromSlugOrId(userSlugOrId);
  const sortedIds = await getSortedPublicListingIds(userId);
  const totalCount = sortedIds.length;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const boundedPage = Math.min(Math.max(page, 1), totalPages);

  const offset = (boundedPage - 1) * pageSize;
  const pageIds = sortedIds.slice(offset, offset + pageSize);
  const items = transformListings(await getListingsByIds(pageIds));

  return {
    items,
    page: boundedPage,
    pageSize,
    totalCount,
    totalPages,
  };
}

interface PublicCatalogRouteEntry {
  slug: string;
  totalPages: number;
  lastModified: Date;
}

export async function getPublicCatalogRouteEntries(): Promise<
  PublicCatalogRouteEntry[]
> {
  const listingCounts = await db.listing.groupBy({
    by: ["userId"],
    where: publicListingVisibilityFilter,
    _count: {
      _all: true,
    },
  });

  const userIds = listingCounts.map((entry) => entry.userId);
  if (userIds.length === 0) {
    return [];
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      createdAt: true,
      profile: {
        select: {
          slug: true,
          updatedAt: true,
        },
      },
    },
    where: {
      id: {
        in: userIds,
      },
    },
  });

  const countByUserId = new Map(
    listingCounts.map((entry) => [entry.userId, entry._count._all]),
  );

  return users.map((user) => {
    const slug = user.profile?.slug ?? user.id;
    const listingCount = countByUserId.get(user.id) ?? 0;
    const totalPages = Math.max(
      1,
      Math.ceil(listingCount / TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE),
    );

    return {
      slug,
      totalPages,
      lastModified: user.profile?.updatedAt ?? user.createdAt,
    };
  });
}
