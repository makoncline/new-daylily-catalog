import "server-only";

import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";
import { getPublicCultivarPage, getCultivarRouteSegments, getCultivarSitemapEntries } from "@/server/db/getPublicCultivars";
import {
  getInitialListings,
  getListings,
  getPublicCatalogRouteEntries,
  getPublicForSaleListingsCount,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";

export const getCachedPublicProfiles = createServerCache(getPublicProfiles, {
  key: "public:profiles",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILES],
});

export const getCachedPublicProfile = createServerCache(getPublicProfile, {
  key: "public:profile",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILE],
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

export const getCachedPublicListingsPage = createServerCache(
  getPublicListingsPage,
  {
    key: "public:listings:page",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE],
  },
);

export const getCachedPublicForSaleListingsCount = createServerCache(
  getPublicForSaleListingsCount,
  {
    key: "public:listings:for-sale-count",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_FOR_SALE_COUNT],
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
