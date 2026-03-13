import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import {
  getCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount,
  getCachedPublicListingCardsByIds,
  getCachedPublicListingsPageIds,
  getCachedPublicSellerContent,
  getCachedPublicSellerLists,
  getCachedPublicSellerSummary,
  getCachedPublicUserIdFromSlugOrId,
} from "@/server/db/public-profile-cache";

function buildPublicProfilePageResult(args: {
  content: Awaited<ReturnType<typeof getCachedPublicSellerContent>>;
  forSaleCount: number;
  items: Awaited<ReturnType<typeof getCachedPublicListingCardsByIds>>;
  listingPage: Awaited<ReturnType<typeof getCachedPublicListingsPageIds>>;
  lists: Awaited<ReturnType<typeof getCachedPublicSellerLists>>;
  summary: Awaited<ReturnType<typeof getCachedPublicSellerSummary>>;
}) {
  const profile = {
    ...args.summary,
    content: args.content,
    _count: {
      listings: args.summary.listingCount,
    },
    lists: args.lists,
  };

  return {
    forSaleCount: args.forSaleCount,
    items: args.items,
    page: args.listingPage.page,
    pageSize: args.listingPage.pageSize,
    profile,
    totalCount: args.listingPage.totalCount,
    totalPages: args.listingPage.totalPages,
  };
}

async function loadPublicProfilePageData(args: {
  includeSellerLists: boolean;
  page: number;
  userSlugOrId: string;
}) {
  const userId = await getCachedPublicUserIdFromSlugOrId(args.userSlugOrId);
  const [summary, content, lists, listingPage, forSaleCount] = await Promise.all([
    getCachedPublicSellerSummary(userId),
    getCachedPublicSellerContent(userId),
    args.includeSellerLists ? getCachedPublicSellerLists(userId) : Promise.resolve([]),
    getCachedPublicListingsPageIds({
      page: args.page,
      pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
      userSlugOrId: args.userSlugOrId,
    }),
    getCachedPublicForSaleListingsCount(userId),
  ]);
  const items = await getCachedPublicListingCardsByIds(listingPage.ids);

  return buildPublicProfilePageResult({
    content,
    forSaleCount,
    items,
    listingPage,
    lists,
    summary,
  });
}

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
  return loadPublicProfilePageData({
    includeSellerLists: page === 1,
    page,
    userSlugOrId,
  });
}
