import { CACHE_CONFIG } from "@/config/cache-config";
import {
  getPublicCatalogsTag,
  getPublicCultivarSummaryTag,
  getPublicCultivarTag,
} from "@/lib/cache/public-cache-tags";
import {
  createKeyedServerCache,
  createServerCache,
} from "@/lib/cache/server-cache";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import {
  buildPublicCultivarPageFromListingCards,
  getPublicCultivarListingIds,
  getPublicCultivarSummary,
  getCultivarRouteSegments,
  getCultivarSitemapEntries,
} from "@/server/db/public-cultivar-read-model";
import {
  getInitialListings,
  getListings,
  getPublicListingDetail,
} from "@/server/db/public-listing-read-model";
import { getCachedPublicListingCardsByIds } from "@/server/db/public-profile-cache";
import {
  getPublicCatalogCardsByUserIds,
  getPublicSellerSummariesByUserIds,
} from "@/server/db/public-seller-read-model";
export {
  getCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount,
  getCachedPublicListingsPage,
  getCachedPublicListingsPageIds,
  getCachedPublicProfile,
  getCachedPublicSellerContent,
  getCachedPublicSellerLists,
  getCachedPublicSellerSummary,
  getCachedPublicUserIdFromSlugOrId,
} from "@/server/db/public-profile-cache";

const getCachedPublicCatalogCardsByUserIds = createKeyedServerCache(
  async (userIds: string[]) =>
    getPublicCatalogCardsByUserIds(userIds, {
      activeUserIds: userIds,
    }),
  {
    getKeyParts: (userIds: string[]) => ["public:catalog-cards", ...userIds],
    getTags: () => [getPublicCatalogsTag()],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  },
);

export async function getCachedPublicProfiles() {
  const proUserIds = await getCachedProUserIds();

  if (proUserIds.length === 0) {
    return [];
  }

  const uniqueUserIds = Array.from(new Set(proUserIds)).sort();
  return getCachedPublicCatalogCardsByUserIds(uniqueUserIds);
}

export const getCachedPublicListings = createServerCache(getListings, {
  key: "public:listings",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTINGS],
});

export const getCachedInitialListings = createServerCache(getInitialListings, {
  key: "public:listings:initial",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTINGS],
});

export const getCachedPublicListingDetail = createServerCache(
  getPublicListingDetail,
  {
    key: "public:listing-detail",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTING_DETAIL],
  },
);

export const getCachedPublicCultivarSummary = createKeyedServerCache(
  async (cultivarSegment: string) => getPublicCultivarSummary(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-summary",
      cultivarSegment,
    ],
    getTags: (cultivarSegment: string) => [
      getPublicCultivarTag(cultivarSegment),
      getPublicCultivarSummaryTag(cultivarSegment),
    ],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

const getCachedPublicCultivarListingIds = createKeyedServerCache(
  async (cultivarSegment: string) => getPublicCultivarListingIds(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-listing-ids",
      cultivarSegment,
    ],
    getTags: (cultivarSegment: string) => [getPublicCultivarTag(cultivarSegment)],
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

export async function getCachedPublicCultivarPage(cultivarSegment: string) {
  const [summarySection, listingIds] = await Promise.all([
    getCachedPublicCultivarSummary(cultivarSegment),
    getCachedPublicCultivarListingIds(cultivarSegment),
  ]);

  if (!summarySection || listingIds === null) {
    return null;
  }

  const listingCards = await getCachedPublicListingCardsByIds(listingIds);
  const activeUserIds = Array.from(
    new Set(listingCards.map((listing) => listing.userId)),
  );
  const summariesByUserId = await getPublicSellerSummariesByUserIds(
    activeUserIds,
    {
      activeUserIds,
    },
  );

  return buildPublicCultivarPageFromListingCards({
    listingCards,
    summariesByUserId,
    summarySection,
  });
}

export const getCachedCultivarRouteSegments = createServerCache(
  getCultivarRouteSegments,
  {
    key: "public:cultivar-segments",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_SEGMENTS],
  },
);

export const getCachedCultivarSitemapEntries = createServerCache(
  getCultivarSitemapEntries,
  {
    key: "public:cultivar-sitemap",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.SITEMAP_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_SITEMAP],
  },
);
