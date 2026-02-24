import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";
import { getPublicCultivarPage, getCultivarRouteSegments, getCultivarSitemapEntries } from "@/server/db/getPublicCultivars";
import {
  getInitialListings,
  getListings,
} from "@/server/db/getPublicListings";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
export {
  getCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount,
  getCachedPublicListingsPage,
  getCachedPublicProfile,
  getCachedPublicUserIdFromSlugOrId,
} from "@/server/db/public-profile-cache";

export const getCachedPublicProfiles = createServerCache(getPublicProfiles, {
  key: "public:profiles",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILES],
});

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

export const getCachedPublicCultivarPage = createServerCache(
  getPublicCultivarPage,
  {
    key: "public:cultivar-page",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE],
  },
);

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
