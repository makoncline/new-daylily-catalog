import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "@/config/constants";
import {
  getPublicForSaleListingsCount,
  getPublicListingCardsByIds,
  getPublicListingsPageIds,
} from "@/server/db/public-listing-read-model";
import {
  getPublicSellerContent,
  getPublicSellerListSummaries,
  getPublicSellerSummary,
  getUserIdFromSlugOrId,
} from "@/server/db/public-seller-read-model";

function buildPublicProfilePageResult(args: {
  content: Awaited<ReturnType<typeof getPublicSellerContent>>;
  forSaleCount: number;
  items: Awaited<ReturnType<typeof getPublicListingCardsByIds>>;
  listingPage: Awaited<ReturnType<typeof getPublicListingsPageIds>>;
  lists: Awaited<ReturnType<typeof getPublicSellerListSummaries>>;
  summary: Awaited<ReturnType<typeof getPublicSellerSummary>>;
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
  const userId = await getUserIdFromSlugOrId(args.userSlugOrId);
  const [summary, content, lists, listingPage, forSaleCount] =
    await Promise.all([
      getPublicSellerSummary(userId),
      getPublicSellerContent(userId),
      args.includeSellerLists
        ? getPublicSellerListSummaries(userId)
        : Promise.resolve([]),
      getPublicListingsPageIds({
        page: args.page,
        pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
        userSlugOrId: args.userSlugOrId,
      }),
      getPublicForSaleListingsCount(userId),
    ]);
  const items = await getPublicListingCardsByIds(listingPage.ids);

  return buildPublicProfilePageResult({
    content,
    forSaleCount,
    items,
    listingPage,
    lists,
    summary,
  });
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
