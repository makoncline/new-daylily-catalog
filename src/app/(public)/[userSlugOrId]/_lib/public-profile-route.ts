import { unstable_cache } from "next/cache";
import { cache } from "react";
import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";
import {
  getPublicForSaleListingsCount,
  getPublicCatalogRouteEntries,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";
import { getPublicProfile } from "@/server/db/getPublicProfile";

type PublicProfile = Awaited<ReturnType<typeof getPublicProfile>>;
type PublicListingsPage = Awaited<ReturnType<typeof getPublicListingsPage>>;

export interface PublicProfilePageData {
  profile: PublicProfile;
  items: PublicListingsPage["items"];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  forSaleCount: number;
}

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

async function loadPublicProfilePageDataUncached(
  userSlugOrId: string,
  page: number,
): Promise<PublicProfilePageData> {
  const [profile, listingPage] = await Promise.all([
    getPublicProfile(userSlugOrId),
    getPublicListingsPage({
      userSlugOrId,
      page,
      pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
    }),
  ]);

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

function getPublicProfilePageDataTag(userSlugOrId: string) {
  return `public-profile-page-data:${userSlugOrId.toLowerCase()}`;
}

const getPublicProfilePageDataByProfileMemoized = cache((userSlugOrId: string) =>
  unstable_cache(
    async (page: number) => loadPublicProfilePageDataUncached(userSlugOrId, page),
    ["public-profile-page-data", userSlugOrId.toLowerCase()],
    {
      revalidate: PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE,
      tags: ["public-profile-page-data", getPublicProfilePageDataTag(userSlugOrId)],
    },
  ));

export async function getPublicProfilePageData(
  userSlugOrId: string,
  page: number,
) {
  return getPublicProfilePageDataByProfileMemoized(userSlugOrId)(page);
}
