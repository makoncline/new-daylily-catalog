import { CACHE_CONFIG } from "@/config/cache-config";
import {
  getPublicCatalogsTag,
  getPublicCultivarSummaryTag,
  getPublicCultivarTag,
  getPublicProfileTag,
} from "@/lib/cache/public-cache-tags";
import {
  createKeyedServerCache,
  createServerCache,
} from "@/lib/cache/server-cache";
import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import {
  buildPublicCultivarGardenPhotosFromListingCards,
  buildPublicCultivarOffersFromListingCards,
  getPublicCultivarListingIds,
  getPublicCultivarSummary,
  getCultivarRouteSegments,
  getCultivarSitemapEntries,
} from "@/server/db/getPublicCultivars";
import { getInitialListings, getListings } from "@/server/db/getPublicListings";
import { getPublicCatalogCardsByUserIds } from "@/server/db/getPublicProfiles";
import { getCachedPublicListingCardsByIds } from "@/server/db/public-profile-cache";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-data";
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
    getTags: (userIds: string[]) =>
      [
        getPublicCatalogsTag(),
        ...userIds.map((userId) => getPublicProfileTag(userId)),
      ],
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

export const getCachedPublicCultivarSummary = createKeyedServerCache(
  async (cultivarSegment: string) => getPublicCultivarSummary(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-summary",
      cultivarSegment.trim().toLowerCase(),
    ],
    getTags: (cultivarSegment: string) => {
      const canonicalSegment = cultivarSegment.trim().toLowerCase();
      return [
        getPublicCultivarTag(canonicalSegment),
        getPublicCultivarSummaryTag(canonicalSegment),
      ];
    },
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

const getCachedPublicCultivarListingIds = createKeyedServerCache(
  async (cultivarSegment: string) => getPublicCultivarListingIds(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-listing-ids",
      cultivarSegment.trim().toLowerCase(),
    ],
    getTags: (cultivarSegment: string) => {
      const canonicalSegment = cultivarSegment.trim().toLowerCase();
      return [getPublicCultivarTag(canonicalSegment)];
    },
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

export async function getCachedPublicCultivarPage(cultivarSegment: string) {
  const [summarySection, listingIds, activeUserIds] = await Promise.all([
    getCachedPublicCultivarSummary(cultivarSegment),
    getCachedPublicCultivarListingIds(cultivarSegment),
    getCachedProUserIds(),
  ]);

  if (!summarySection || listingIds === null) {
    return null;
  }

  const listingCards = await getCachedPublicListingCardsByIds(listingIds);
  const summariesByUserId = await getPublicSellerSummariesByUserIds(
    Array.from(new Set(listingCards.map((listing) => listing.userId))),
    {
      activeUserIds,
    },
  );
  const offersSection = buildPublicCultivarOffersFromListingCards({
    listingCards,
    summariesByUserId,
  });
  const photosSection = buildPublicCultivarGardenPhotosFromListingCards({
    listingCards,
    summariesByUserId,
  });

  return {
    ...summarySection,
    gardenPhotos: photosSection.gardenPhotos,
    offers: offersSection.offers,
    freshness: {
      cultivarUpdatedAt: summarySection.freshness.cultivarUpdatedAt,
      offersUpdatedAt: offersSection.freshness.offersUpdatedAt,
      photosUpdatedAt: photosSection.freshness.photosUpdatedAt,
    },
  };
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
