import { CACHE_CONFIG } from "@/config/cache-config";
import {
  getPublicForSaleCountTag,
  getPublicListingCardTag,
  getPublicListingsPageTag,
  getPublicProfileTag,
  getPublicSellerContentTag,
  getPublicSellerListsTag,
} from "@/lib/cache/public-cache-tags";
import {
  createServerCache,
  createKeyedServerCache,
} from "@/lib/cache/server-cache";
import {
  getPublicCatalogRouteEntries,
  getPublicForSaleListingsCount,
  getPublicListingCardsByIds,
  getPublicListingsPageIdsForUserId,
} from "@/server/db/getPublicListings";
import {
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import {
  getPublicSellerContent,
  getPublicSellerListSummaries,
  getPublicSellerSummary,
} from "@/server/db/public-seller-data";

export const getCachedPublicUserIdFromSlugOrId = createServerCache(
  getUserIdFromSlugOrId,
  {
    key: "public:profile:user-id",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.PROFILE_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILE],
  },
);

export async function getCachedPublicProfile(userSlugOrId: string) {
  const userId = await getCachedPublicUserIdFromSlugOrId(userSlugOrId);

  const [summary, content, lists] = await Promise.all([
    getCachedPublicSellerSummary(userId),
    getCachedPublicSellerContent(userId),
    getCachedPublicSellerLists(userId),
  ]);

  return {
    ...summary,
    content,
    _count: {
      listings: summary.listingCount,
    },
    lists,
  };
}

export const getCachedPublicSellerSummary = createKeyedServerCache(
  getPublicSellerSummary,
  {
    getKeyParts: (userId: string) => ["public:seller-summary", userId],
    getTags: (userId: string) => [getPublicProfileTag(userId)],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.PROFILE_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicSellerContent = createKeyedServerCache(
  getPublicSellerContent,
  {
    getKeyParts: (userId: string) => ["public:seller-content", userId],
    getTags: (userId: string) => [getPublicSellerContentTag(userId)],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.PROFILE_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicSellerLists = createKeyedServerCache(
  getPublicSellerListSummaries,
  {
    getKeyParts: (userId: string) => ["public:seller-lists", userId],
    getTags: (userId: string) => [getPublicSellerListsTag(userId)],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  },
);

export async function getCachedPublicListingsPage(args: {
  userSlugOrId: string;
  page: number;
  pageSize?: number;
}) {
  const pageData = await getCachedPublicListingsPageIds(args);
  const items = await getCachedPublicListingCardsByIds(pageData.ids);

  return {
    items,
    page: pageData.page,
    pageSize: pageData.pageSize,
    totalCount: pageData.totalCount,
    totalPages: pageData.totalPages,
  };
}

export async function getCachedPublicListingsPageIds(args: {
  userSlugOrId: string;
  page: number;
  pageSize?: number;
}) {
  const userId = await getCachedPublicUserIdFromSlugOrId(args.userSlugOrId);
  return getCachedPublicListingsPageIdsForUserId({
    page: args.page,
    pageSize: args.pageSize,
    userId,
  });
}

const getCachedPublicListingsPageIdsForUserId = createKeyedServerCache(
  getPublicListingsPageIdsForUserId,
  {
    getKeyParts: (args) => [
      "public:listings:page",
      args.userId,
      String(args.page),
      String(args.pageSize ?? ""),
    ],
    getTags: (args) => [
      getPublicListingsPageTag(args.userId),
      getPublicListingsPageTag(args.userId, args.page),
    ],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicListingCardsByIds = createKeyedServerCache(
  async (ids: string[]) => {
    if (ids.length === 0) {
      return [];
    }

    return getPublicListingCardsByIds(ids);
  },
  {
    getKeyParts: (ids: string[]) => ["public:listings:cards", ...ids],
    getTags: (ids: string[]) => ids.map((id) => getPublicListingCardTag(id)),
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicForSaleListingsCount = createKeyedServerCache(
  getPublicForSaleListingsCount,
  {
    getKeyParts: (userId: string) => ["public:listings:for-sale-count", userId],
    getTags: (userId: string) => [getPublicForSaleCountTag(userId)],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicCatalogRouteEntries = createServerCache(
  getPublicCatalogRouteEntries,
  {
    key: "public:catalog-routes",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_CATALOG_ROUTES],
  },
);
