import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";
import {
  getPublicCatalogRouteEntries,
  getPublicForSaleListingsCount,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";

export const getCachedPublicProfile = createServerCache(getPublicProfile, {
  key: "public:profile",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILE],
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
