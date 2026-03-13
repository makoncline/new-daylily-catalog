import { CACHE_CONFIG } from "@/config/cache-config";
import {
  getPublicCultivarOffersTag,
  getPublicCultivarPhotosTag,
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
  getPublicCultivarGardenPhotos,
  getPublicCultivarOffers,
  getPublicCultivarSummary,
  getCultivarRouteSegments,
  getCultivarSitemapEntries,
} from "@/server/db/getPublicCultivars";
import { getInitialListings, getListings } from "@/server/db/getPublicListings";
import { getPublicCatalogCardsByUserIds } from "@/server/db/getPublicProfiles";
export {
  getCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount,
  getCachedPublicListingCardsByIds,
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
      userIds.map((userId) => getPublicProfileTag(userId)),
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

export const getCachedPublicCultivarOffers = createKeyedServerCache(
  async (cultivarSegment: string) => getPublicCultivarOffers(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-offers",
      cultivarSegment.trim().toLowerCase(),
    ],
    getTags: (cultivarSegment: string) => {
      const canonicalSegment = cultivarSegment.trim().toLowerCase();
      return [
        getPublicCultivarTag(canonicalSegment),
        getPublicCultivarOffersTag(canonicalSegment),
      ];
    },
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

export const getCachedPublicCultivarGardenPhotos = createKeyedServerCache(
  async (cultivarSegment: string) =>
    getPublicCultivarGardenPhotos(cultivarSegment),
  {
    getKeyParts: (cultivarSegment: string) => [
      "public:cultivar-photos",
      cultivarSegment.trim().toLowerCase(),
    ],
    getTags: (cultivarSegment: string) => {
      const canonicalSegment = cultivarSegment.trim().toLowerCase();
      return [
        getPublicCultivarTag(canonicalSegment),
        getPublicCultivarPhotosTag(canonicalSegment),
      ];
    },
    revalidateSeconds: CACHE_CONFIG.PUBLIC.CULTIVAR_PAGE_REVALIDATE_SECONDS,
  },
);

export async function getCachedPublicCultivarPage(cultivarSegment: string) {
  const [summarySection, photosSection, offersSection] = await Promise.all([
    getCachedPublicCultivarSummary(cultivarSegment),
    getCachedPublicCultivarGardenPhotos(cultivarSegment),
    getCachedPublicCultivarOffers(cultivarSegment),
  ]);

  if (!summarySection || !photosSection || !offersSection) {
    return null;
  }

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
