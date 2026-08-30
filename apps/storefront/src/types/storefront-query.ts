import type {
  StorefrontList,
  StorefrontListing,
  StorefrontSnapshot,
} from "./storefront";

export type StorefrontPriceRange =
  | "under-10"
  | "10-to-19"
  | "20-to-29"
  | "30-to-39"
  | "40-to-49"
  | "50-plus";

export type StorefrontBloomSize =
  | "miniature"
  | "small"
  | "large"
  | "extra-large";

export type StorefrontScapeHeight =
  | "miniature"
  | "short"
  | "medium"
  | "tall"
  | "extra-tall";

export interface StorefrontListingFilters {
  name?: string;
  char?: string;
  list?: string;
  hybridizer?: string;
  year?: string;
  ploidy?: string;
  color?: string;
  form?: string;
  foliageType?: string;
  note?: string;
  fragrance?: string;
  bloomSize?: StorefrontBloomSize | "";
  scapeHeight?: StorefrontScapeHeight | "";
  bloomSeason?: string;
  rebloom?: boolean;
  price?: StorefrontPriceRange | "";
}

export interface StorefrontFilterOptions {
  chars: string[];
  lists: string[];
  colors: string[];
  hybridizers: string[];
  years: string[];
  ploidies: string[];
  forms: string[];
  foliageTypes: string[];
  fragrances: string[];
  bloomSeasons: string[];
}

const titleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function titleCategory(title: string) {
  const first = title.trim().charAt(0);
  if (/[a-z]/i.test(first)) {
    return 0;
  }
  if (/\d/.test(first)) {
    return 1;
  }
  return 2;
}

export function sortStorefrontListings(listings: readonly StorefrontListing[]) {
  return [...listings].sort((left, right) => {
    const categoryDifference =
      titleCategory(left.title) - titleCategory(right.title);
    if (categoryDifference !== 0) {
      return categoryDifference;
    }

    return (
      titleCollator.compare(left.title.trim(), right.title.trim()) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function findStorefrontListingBySlug(
  snapshot: StorefrontSnapshot,
  slug: string,
) {
  const normalizedSlug = slug.trim().toLowerCase();
  return (
    snapshot.listings.find(
      (listing) => listing.slug.toLowerCase() === normalizedSlug,
    ) ?? null
  );
}

export function findStorefrontListBySlug(
  snapshot: StorefrontSnapshot,
  slug: string,
) {
  const normalizedSlug = slug.trim().toLowerCase();
  return (
    snapshot.lists.find((list) => list.slug.toLowerCase() === normalizedSlug) ??
    null
  );
}

export function getStorefrontListingsForList(
  snapshot: StorefrontSnapshot,
  list: StorefrontList,
) {
  const listingById = new Map(
    snapshot.listings.map((listing) => [listing.id, listing]),
  );
  return list.listingIds.flatMap((id) => {
    const listing = listingById.get(id);
    return listing ? [listing] : [];
  });
}

export function getStorefrontForSaleListings(snapshot: StorefrontSnapshot) {
  return sortStorefrontListings(
    snapshot.listings.filter(
      (listing) => listing.price !== null && listing.price > 0,
    ),
  );
}

function includesText(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query.trim().toLowerCase()) ?? false;
}

function parseMeasurement(value: string | null | undefined) {
  const match = value?.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function matchesBloomSize(value: number, range: StorefrontBloomSize) {
  switch (range) {
    case "miniature":
      return value <= 3;
    case "small":
      return value > 3 && value <= 4.5;
    case "large":
      return value > 4.5 && value < 7;
    case "extra-large":
      return value >= 7;
  }
}

function matchesScapeHeight(value: number, range: StorefrontScapeHeight) {
  switch (range) {
    case "miniature":
      return value <= 10;
    case "short":
      return value > 10 && value <= 20;
    case "medium":
      return value > 20 && value <= 30;
    case "tall":
      return value > 30 && value <= 40;
    case "extra-tall":
      return value > 40;
  }
}

function matchesPrice(value: number, range: StorefrontPriceRange) {
  switch (range) {
    case "under-10":
      return value > 0 && value < 10;
    case "10-to-19":
      return value >= 10 && value < 20;
    case "20-to-29":
      return value >= 20 && value < 30;
    case "30-to-39":
      return value >= 30 && value < 40;
    case "40-to-49":
      return value >= 40 && value < 50;
    case "50-plus":
      return value >= 50;
  }
}

function getListMembership(lists: readonly StorefrontList[]) {
  const listIdsByListingId = new Map<string, Set<string>>();
  for (const list of lists) {
    for (const listingId of list.listingIds) {
      const memberships = listIdsByListingId.get(listingId) ?? new Set();
      memberships.add(list.id);
      listIdsByListingId.set(listingId, memberships);
    }
  }
  return listIdsByListingId;
}

export function filterStorefrontListings(
  listings: readonly StorefrontListing[],
  filters: StorefrontListingFilters = {},
  lists: readonly StorefrontList[] = [],
) {
  const listMembership = getListMembership(lists);
  let selectedListId: string | null = null;
  if (filters.list && filters.list.toLowerCase() !== "no-list") {
    const listQuery = filters.list.toLowerCase();
    selectedListId =
      lists.find((list) => list.slug.toLowerCase() === listQuery)?.id ?? null;
  }

  return sortStorefrontListings(
    listings.filter((listing) => {
      const details = listing.cultivar?.details;
      if (filters.name && !includesText(listing.title, filters.name)) {
        return false;
      }
      if (
        filters.char &&
        listing.title.trim().charAt(0).toLowerCase() !==
          filters.char.trim().charAt(0).toLowerCase()
      ) {
        return false;
      }
      if (filters.list) {
        const memberships = listMembership.get(listing.id);
        if (filters.list.toLowerCase() === "no-list") {
          if (memberships && memberships.size > 0) {
            return false;
          }
        } else if (!selectedListId || !memberships?.has(selectedListId)) {
          return false;
        }
      }
      if (
        filters.hybridizer &&
        !includesText(details?.hybridizer, filters.hybridizer)
      ) {
        return false;
      }
      if (filters.year && !includesText(details?.year, filters.year)) {
        return false;
      }
      if (filters.ploidy && !includesText(details?.ploidy, filters.ploidy)) {
        return false;
      }
      if (filters.color && !includesText(details?.color, filters.color)) {
        return false;
      }
      if (
        filters.form &&
        !includesText(details?.form, filters.form) &&
        !includesText(details?.flower, filters.form)
      ) {
        return false;
      }
      if (
        filters.foliageType &&
        !includesText(details?.foliageType, filters.foliageType)
      ) {
        return false;
      }
      if (filters.note && !includesText(listing.description, filters.note)) {
        return false;
      }
      if (
        filters.fragrance &&
        !includesText(details?.fragrance, filters.fragrance)
      ) {
        return false;
      }
      if (
        filters.bloomSeason &&
        details?.bloomSeason?.toLowerCase() !==
          filters.bloomSeason.trim().toLowerCase()
      ) {
        return false;
      }
      if (filters.rebloom && details?.rebloom !== true) {
        return false;
      }
      if (filters.bloomSize) {
        const bloomSize = parseMeasurement(details?.bloomSize);
        if (
          bloomSize === null ||
          !matchesBloomSize(bloomSize, filters.bloomSize)
        ) {
          return false;
        }
      }
      if (filters.scapeHeight) {
        const scapeHeight = parseMeasurement(details?.scapeHeight);
        if (
          scapeHeight === null ||
          !matchesScapeHeight(scapeHeight, filters.scapeHeight)
        ) {
          return false;
        }
      }
      if (filters.price) {
        if (
          listing.price === null ||
          !matchesPrice(listing.price, filters.price)
        ) {
          return false;
        }
      }
      return true;
    }),
  );
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value)),
  ).sort((left, right) => titleCollator.compare(left, right));
}

export function getStorefrontFilterOptions(
  listings: readonly StorefrontListing[],
  lists: readonly StorefrontList[],
): StorefrontFilterOptions {
  return {
    chars: uniqueSorted(
      listings.map((listing) => listing.title.trim().charAt(0).toUpperCase()),
    ),
    lists: [...uniqueSorted(lists.map((list) => list.title)), "No List"],
    colors: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.color),
    ),
    hybridizers: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.hybridizer),
    ),
    years: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.year),
    ).reverse(),
    ploidies: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.ploidy),
    ),
    forms: uniqueSorted(
      listings.flatMap((listing) => [
        listing.cultivar?.details?.form,
        listing.cultivar?.details?.flower,
      ]),
    ),
    foliageTypes: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.foliageType),
    ),
    fragrances: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.fragrance),
    ),
    bloomSeasons: uniqueSorted(
      listings.map((listing) => listing.cultivar?.details?.bloomSeason),
    ),
  };
}

export function getStorefrontSearchResult(
  listings: readonly StorefrontListing[],
  filters: StorefrontListingFilters,
  lists: readonly StorefrontList[],
  requestedPage = 1,
  pageSize = 24,
) {
  const filteredListings = filterStorefrontListings(listings, filters, lists);
  const safePageSize =
    Number.isFinite(pageSize) && pageSize >= 1 ? Math.trunc(pageSize) : 24;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredListings.length / safePageSize),
  );
  const normalizedRequestedPage = Number.isFinite(requestedPage)
    ? Math.trunc(requestedPage)
    : 1;
  const page = Math.min(Math.max(normalizedRequestedPage, 1), pageCount);

  return {
    listings: filteredListings.slice(
      (page - 1) * safePageSize,
      page * safePageSize,
    ),
    total: filteredListings.length,
    page,
    pageSize: safePageSize,
    pageCount,
  };
}
