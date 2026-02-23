import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import {
  getCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount,
  getCachedPublicListingsPage,
  getCachedPublicProfile,
} from "@/server/db/public-cache";

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
