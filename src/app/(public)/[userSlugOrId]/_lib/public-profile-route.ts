import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import {
  getPublicForSaleListingsCount,
  getPublicCatalogRouteEntries,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";

export async function getPublicProfileStaticParams() {
  const entries = await getPublicCatalogRouteEntries();

  return entries.map((entry) => ({
    userSlugOrId: entry.slug,
  }));
}

export async function getPublicProfilePaginatedStaticParams() {
  const entries = await getPublicCatalogRouteEntries();
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
  const profile = await getPublicProfile(userSlugOrId);
  const listingPage = await getPublicListingsPage({
    userSlugOrId,
    page,
    pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
  });
  const forSaleCount = await getPublicForSaleListingsCount(profile.id);

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
