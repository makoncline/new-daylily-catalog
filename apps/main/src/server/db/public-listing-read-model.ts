import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE, STATUS } from "@/config/constants";
import {
  withResolvedDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import {
  getActiveProUserIdsForUserIds,
  getProUserIds,
} from "@/server/db/getProUserIds";
import { replicaDb } from "@/server/db";
import { getUserIdFromSlugOrId } from "@/server/db/getPublicProfile";
import {
  isPublicList,
  isPublished,
} from "@/server/db/public-visibility/filters";
import { getCloudflareUrlForDaylilyS3Image } from "@/lib/utils/cloudflareLoader";
import {
  areImageAssetsEnabled,
  orderedImageAssetUrlInclude,
  resolveLegacyImagesWithAssets,
} from "@/server/services/image-asset-read-model";
import {
  generatedCultivarImageAssetInclude,
  resolveCultivarReferenceImage,
  shouldQueryGeneratedCultivarImageAssets,
} from "@/server/services/cultivar-reference-image-read-model";

export const publicListingSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  price: true,
  userId: true,
  updatedAt: true,
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
    where: isPublicList(),
    select: {
      id: true,
      title: true,
    },
  },
  cultivarReference: {
    select: {
      id: true,
      normalizedName: true,
      v2AhsCultivar: {
        select: v2AhsCultivarDisplaySelect,
      },
      ...(shouldQueryGeneratedCultivarImageAssets()
        ? { imageAssets: generatedCultivarImageAssetInclude }
        : {}),
    },
  },
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
  ...(areImageAssetsEnabled()
    ? { imageAssets: orderedImageAssetUrlInclude }
    : {}),
} as const;

type ListingWithRelations = Awaited<ReturnType<typeof getListings>>[number];
type ListingPayload = Prisma.ListingGetPayload<{
  select: typeof publicListingSelect;
}>;

interface GetListingsArgs {
  userId: string;
  limit: number;
  cursor?: string;
}

function buildListingView<T extends ListingPayload>(listing: T) {
  const displayListing = withResolvedDisplayAhsListing(listing);
  const displayAhsListing = displayListing.ahsListing;
  const cultivarReferenceImage = displayListing.cultivarReference
    ? resolveCultivarReferenceImage({
        id: `ahs-${displayListing.id}`,
        fallbackImageUrl: displayAhsListing?.ahsImageUrl,
        imageAssets:
          "imageAssets" in displayListing.cultivarReference
            ? displayListing.cultivarReference.imageAssets
            : [],
      })
    : null;
  const resolvedImages = resolveLegacyImagesWithAssets({
    images: displayListing.images,
    imageAssets: "imageAssets" in displayListing ? displayListing.imageAssets : [],
    variant: "display",
  });
  const publicCultivarReference = displayListing.cultivarReference
    ? (({ imageAssets: _imageAssets, ...cultivarReference }) =>
        cultivarReference)(displayListing.cultivarReference)
    : displayListing.cultivarReference;
  const publicListingBase =
    "imageAssets" in displayListing
      ? (({ imageAssets: _imageAssets, ...listing }) => listing)(
          displayListing,
        )
      : displayListing;
  const publicListing = {
    ...publicListingBase,
    cultivarReference: publicCultivarReference,
  };
  const images =
    resolvedImages.length === 0 && cultivarReferenceImage
      ? [
          {
            ...cultivarReferenceImage,
            updatedAt: displayListing.updatedAt,
          },
        ]
      : resolvedImages;

  return {
    ...publicListing,
    ahsListing: displayAhsListing,
    cultivarReferenceImage,
    userSlug: listing.user.profile?.slug ?? listing.userId,
    sellerTitle: listing.user.profile?.title ?? null,
    images: images.map((image) => ({
      ...image,
      url: getCloudflareUrlForDaylilyS3Image(image.url),
    })),
  };
}

export function buildPublicListingDetail(
  listing: ListingPayload,
  hasActiveSubscription = false,
) {
  return {
    ...buildListingView(listing),
    hasActiveSubscription,
  };
}

async function getSortedPublicListingIds(
  userId: string,
  options?: {
    forSaleFirst?: boolean;
  },
): Promise<string[]> {
  const forSaleFirst = options?.forSaleFirst ?? false;
  const rows = forSaleFirst
    ? await replicaDb.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "Listing"
        WHERE "userId" = ${userId}
          AND ("status" IS NULL OR "status" <> ${STATUS.HIDDEN})
        ORDER BY
          CASE
            WHEN COALESCE("price", 0) > 0 THEN 0
            ELSE 1
          END,
          CASE
            WHEN LTRIM("title") GLOB '[A-Za-z]*' THEN 0
            WHEN LTRIM("title") GLOB '[0-9]*' THEN 1
            ELSE 2
          END,
          LTRIM("title") COLLATE NOCASE ASC,
          "id" ASC
      `)
    : await replicaDb.$queryRaw<Array<{ id: string }>>(Prisma.sql`
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

async function getPublicListingRowsByIds(
  ids: string[],
): Promise<ListingPayload[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await replicaDb.listing.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: publicListingSelect,
  });

  const rowById = new Map(rows.map((row) => [row.id, row]));

  return ids
    .map((id) => rowById.get(id))
    .filter((row): row is ListingPayload => Boolean(row));
}

export async function getListings(args: GetListingsArgs) {
  const sortedIds = await getSortedPublicListingIds(args.userId);
  const cursorIndex = args.cursor ? sortedIds.indexOf(args.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const pageIds = sortedIds.slice(startIndex, startIndex + args.limit + 1);

  return getPublicListingRowsByIds(pageIds);
}

export function transformListings(listings: ListingWithRelations[]) {
  return listings.map((listing) => buildListingView(listing));
}

export async function getPublicListingCardsByIds(ids: string[]) {
  const rows = await getPublicListingRowsByIds(ids);
  return transformListings(rows);
}

export async function getInitialListings(userSlugOrId: string) {
  const userId = await getUserIdFromSlugOrId(userSlugOrId);
  const items = await getListings({ userId, limit: 36 });

  return transformListings(items);
}

export interface GetPublicListingsPageArgs {
  userSlugOrId: string;
  page: number;
  pageSize?: number;
}

export interface GetPublicListingsPageIdsForUserIdArgs {
  userId: string;
  page: number;
  pageSize?: number;
}

export async function getPublicListingsPageIdsForUserId({
  userId,
  page,
  pageSize = PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
}: GetPublicListingsPageIdsForUserIdArgs) {
  const sortedIds = await getSortedPublicListingIds(userId, {
    forSaleFirst: true,
  });
  const totalCount = sortedIds.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const boundedPage = Math.min(Math.max(page, 1), totalPages);
  const offset = (boundedPage - 1) * pageSize;
  const ids = sortedIds.slice(offset, offset + pageSize);

  return {
    ids,
    userId,
    page: boundedPage,
    pageSize,
    totalCount,
    totalPages,
  };
}

async function getPublicListingsPageIds({
  userSlugOrId,
  page,
  pageSize = PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
}: GetPublicListingsPageArgs) {
  const userId = await getUserIdFromSlugOrId(userSlugOrId);

  return getPublicListingsPageIdsForUserId({
    userId,
    page,
    pageSize,
  });
}

export async function getPublicListingsPage(args: GetPublicListingsPageArgs) {
  const pageData = await getPublicListingsPageIds(args);
  const items = await getPublicListingCardsByIds(pageData.ids);

  return {
    items,
    page: pageData.page,
    pageSize: pageData.pageSize,
    totalCount: pageData.totalCount,
    totalPages: pageData.totalPages,
  };
}

export async function getPublicListingDetail(listingId: string) {
  const listing = await replicaDb.listing.findFirst({
    where: { id: listingId, ...isPublished() },
    select: publicListingSelect,
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  const proUserIds = await getActiveProUserIdsForUserIds([listing.userId]);

  return buildPublicListingDetail(listing, proUserIds.includes(listing.userId));
}

export async function getPublicForSaleListingsCount(userId: string) {
  return replicaDb.listing.count({
    where: {
      userId,
      price: {
        gt: 0,
      },
      ...isPublished(),
    },
  });
}

interface PublicCatalogRouteEntry {
  slug: string;
  totalPages: number;
  lastModified: Date;
}

interface PublicListingRouteEntry {
  listingSlug: string;
  sellerSlug: string;
  lastModified: Date;
}

export async function getPublicCatalogRouteEntries(): Promise<
  PublicCatalogRouteEntry[]
> {
  const proUserIds = await getProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

  const listingCounts = await replicaDb.listing.groupBy({
    by: ["userId"],
    where: {
      ...isPublished(),
      userId: {
        in: proUserIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  if (listingCounts.length === 0) {
    return [];
  }

  const userIds = listingCounts.map((entry) => entry.userId);
  const users = await replicaDb.user.findMany({
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
      Math.ceil(listingCount / PUBLIC_PROFILE_LISTINGS_PAGE_SIZE),
    );

    return {
      slug,
      totalPages,
      lastModified: user.profile?.updatedAt ?? user.createdAt,
    };
  });
}

export async function getPublicListingRouteEntries(): Promise<
  PublicListingRouteEntry[]
> {
  const proUserIds = await getProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

  const listings = await replicaDb.listing.findMany({
    where: {
      ...isPublished(),
      userId: {
        in: proUserIds,
      },
    },
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          profile: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return listings.map((listing) => ({
    sellerSlug: listing.user.profile?.slug ?? listing.user.id,
    listingSlug: listing.slug || listing.id,
    lastModified: listing.updatedAt,
  }));
}
