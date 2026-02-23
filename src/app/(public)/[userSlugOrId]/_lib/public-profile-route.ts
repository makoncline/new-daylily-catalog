import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";
import {
  getPublicForSaleListingsCount,
  getPublicCatalogRouteEntries,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";

const getCachedPublicCatalogRouteEntries = createServerCache(
  getPublicCatalogRouteEntries,
  {
    key: "public:catalog-routes",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_CATALOG_ROUTES],
  },
);

const getCachedPublicProfile = createServerCache(getPublicProfile, {
  key: "public:profile",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.SEARCH.SERVER_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PROFILE],
});

const getCachedPublicListingsPage = createServerCache(getPublicListingsPage, {
  key: "public:listings:page",
  revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE],
});

const getCachedPublicForSaleListingsCount = createServerCache(
  getPublicForSaleListingsCount,
  {
    key: "public:listings:for-sale-count",
    revalidateSeconds: CACHE_CONFIG.PUBLIC.STATIC_REVALIDATE_SECONDS,
    tags: [CACHE_CONFIG.TAGS.PUBLIC_FOR_SALE_COUNT],
  },
);

export async function getPublicProfileStaticParams() {
  const entries = await getCachedPublicCatalogRouteEntries();

  return entries.map((entry) => ({
    userSlugOrId: entry.slug,
  }));
}

export async function getPublicProfilePaginatedStaticParams() {
  const entries = await getCachedPublicCatalogRouteEntries();
  const params: { userSlugOrId: string; page: string }[] = [];

  entries.forEach((entry) => {
    for (let page = 2; page <= entry.totalPages; page += 1) {
      params.push({
        userSlugOrId: entry.slug,
        page: String(page),
      });
    }
  });

  return params;
}

export async function getPublicProfilePageData(
  userSlugOrId: string,
  page: number,
) {
  const profile = await getCachedPublicProfile(userSlugOrId);
  const listingPage = await getCachedPublicListingsPage({
    userSlugOrId,
    page,
    pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
  });
  const forSaleCount = await getCachedPublicForSaleListingsCount(profile.id);

  return {
    profile,
    items: listingPage.items,
    page: listingPage.page,
    pageSize: listingPage.pageSize,
    totalCount: listingPage.totalCount,
    totalPages: listingPage.totalPages,
    forSaleCount,
  };
}
