import {
  getPublicProfilePagePath,
  parsePositiveInteger,
} from "@/lib/public-catalog-url-state";

interface LegacyListingRedirectInfo {
  listingSlug: string | null;
  userId: string;
  userSlug: string | null;
}

type LegacySearchParams = Record<string, string | string[] | undefined>;

export function buildLegacyListingRedirectPath(
  listingId: string,
  listingInfo: LegacyListingRedirectInfo,
) {
  if (listingInfo.userSlug && listingInfo.listingSlug) {
    return `/${listingInfo.userSlug}/${listingInfo.listingSlug}`;
  }

  if (listingInfo.userSlug) {
    return `/${listingInfo.userSlug}/${listingId}`;
  }

  if (listingInfo.listingSlug) {
    return `/${listingInfo.userId}/${listingInfo.listingSlug}`;
  }

  return `/${listingInfo.userId}/${listingId}`;
}

export function searchParamsToQueryString(searchParams: LegacySearchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      params.append(key, value);
      return;
    }

    value?.forEach((entry) => {
      params.append(key, entry);
    });
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function buildLegacyUserRedirectPath(args: {
  canonicalUserSlug: string;
  searchParams: LegacySearchParams;
}) {
  const page = parsePositiveInteger(
    Array.isArray(args.searchParams.page)
      ? args.searchParams.page[0]
      : args.searchParams.page,
    1,
  );
  const nextSearchParams = { ...args.searchParams };
  delete nextSearchParams.page;

  return `${getPublicProfilePagePath(
    args.canonicalUserSlug,
    page,
  )}${searchParamsToQueryString(nextSearchParams)}`;
}
