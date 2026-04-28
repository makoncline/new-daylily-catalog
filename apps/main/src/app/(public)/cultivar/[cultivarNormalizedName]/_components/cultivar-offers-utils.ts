import { type RouterOutputs } from "@/trpc/react";

export const OFFER_QUERY_KEYS = {
  sort: "offerSort",
  forSale: "offerForSale",
  hasPhoto: "offerHasPhoto",
} as const;

export const OFFER_SORT_OPTIONS = [
  "best-match",
  "price-asc",
  "price-desc",
  "updated-desc",
] as const;

export type OfferSort = (typeof OFFER_SORT_OPTIONS)[number];

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type OfferGardenCard = CultivarPageOutput["offers"]["gardenCards"][number];
type OfferListing = OfferGardenCard["offers"][number];

export interface OfferFilters {
  sort: OfferSort;
  forSaleOnly: boolean;
  hasPhotoOnly: boolean;
}

export interface FilteredOffers {
  gardens: OfferGardenCard[];
  offersCount: number;
}

export const DEFAULT_OFFER_FILTERS: OfferFilters = {
  sort: "best-match",
  forSaleOnly: false,
  hasPhotoOnly: false,
};

function isOfferSort(value: string | null): value is OfferSort {
  return Boolean(value) && OFFER_SORT_OPTIONS.includes(value as OfferSort);
}

export function parseOfferFilters(searchParams: URLSearchParams): OfferFilters {
  const sortParam = searchParams.get(OFFER_QUERY_KEYS.sort);

  return {
    sort: isOfferSort(sortParam) ? sortParam : DEFAULT_OFFER_FILTERS.sort,
    forSaleOnly: searchParams.get(OFFER_QUERY_KEYS.forSale) === "1",
    hasPhotoOnly: searchParams.get(OFFER_QUERY_KEYS.hasPhoto) === "1",
  };
}

export function applyOfferFiltersToSearchParams(
  searchParams: URLSearchParams,
  filters: OfferFilters,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (filters.sort === DEFAULT_OFFER_FILTERS.sort) {
    params.delete(OFFER_QUERY_KEYS.sort);
  } else {
    params.set(OFFER_QUERY_KEYS.sort, filters.sort);
  }

  if (filters.forSaleOnly) {
    params.set(OFFER_QUERY_KEYS.forSale, "1");
  } else {
    params.delete(OFFER_QUERY_KEYS.forSale);
  }

  if (filters.hasPhotoOnly) {
    params.set(OFFER_QUERY_KEYS.hasPhoto, "1");
  } else {
    params.delete(OFFER_QUERY_KEYS.hasPhoto);
  }

  return params;
}

function compareBestMatch(a: OfferListing, b: OfferListing) {
  const aForSale = a.price !== null ? 1 : 0;
  const bForSale = b.price !== null ? 1 : 0;

  if (aForSale !== bForSale) {
    return bForSale - aForSale;
  }

  if (a.imageCount !== b.imageCount) {
    return b.imageCount - a.imageCount;
  }

  const aUpdated = new Date(a.updatedAt).getTime();
  const bUpdated = new Date(b.updatedAt).getTime();
  if (aUpdated !== bUpdated) {
    return bUpdated - aUpdated;
  }

  return a.title.localeCompare(b.title);
}

function comparePriceAsc(a: OfferListing, b: OfferListing) {
  if (a.price === null && b.price === null) {
    return compareBestMatch(a, b);
  }

  if (a.price === null) {
    return 1;
  }

  if (b.price === null) {
    return -1;
  }

  if (a.price !== b.price) {
    return a.price - b.price;
  }

  return compareBestMatch(a, b);
}

function comparePriceDesc(a: OfferListing, b: OfferListing) {
  if (a.price === null && b.price === null) {
    return compareBestMatch(a, b);
  }

  if (a.price === null) {
    return 1;
  }

  if (b.price === null) {
    return -1;
  }

  if (a.price !== b.price) {
    return b.price - a.price;
  }

  return compareBestMatch(a, b);
}

function compareUpdatedDesc(a: OfferListing, b: OfferListing) {
  const aUpdated = new Date(a.updatedAt).getTime();
  const bUpdated = new Date(b.updatedAt).getTime();

  if (aUpdated !== bUpdated) {
    return bUpdated - aUpdated;
  }

  return compareBestMatch(a, b);
}

function sortOffers(offers: OfferListing[], sort: OfferSort) {
  const items = [...offers];

  if (sort === "price-asc") {
    return items.sort(comparePriceAsc);
  }

  if (sort === "price-desc") {
    return items.sort(comparePriceDesc);
  }

  if (sort === "updated-desc") {
    return items.sort(compareUpdatedDesc);
  }

  return items.sort(compareBestMatch);
}

function filterOffers(offers: OfferListing[], filters: OfferFilters) {
  return offers.filter((offer) => {
    if (filters.forSaleOnly && offer.price === null) {
      return false;
    }

    if (filters.hasPhotoOnly && offer.imageCount === 0) {
      return false;
    }

    return true;
  });
}

function compareGardenCards(a: OfferGardenCard, b: OfferGardenCard, sort: OfferSort) {
  const aTopOffer = a.offers[0];
  const bTopOffer = b.offers[0];

  if (!aTopOffer && !bTopOffer) {
    return a.title.localeCompare(b.title);
  }

  if (!aTopOffer) {
    return 1;
  }

  if (!bTopOffer) {
    return -1;
  }

  if (sort === "price-asc") {
    const diff = comparePriceAsc(aTopOffer, bTopOffer);
    if (diff !== 0) {
      return diff;
    }

    return a.title.localeCompare(b.title);
  }

  if (sort === "price-desc") {
    const diff = comparePriceDesc(aTopOffer, bTopOffer);
    if (diff !== 0) {
      return diff;
    }

    return a.title.localeCompare(b.title);
  }

  if (sort === "updated-desc") {
    const diff = compareUpdatedDesc(aTopOffer, bTopOffer);
    if (diff !== 0) {
      return diff;
    }

    return a.title.localeCompare(b.title);
  }

  const diff = compareBestMatch(aTopOffer, bTopOffer);
  if (diff !== 0) {
    return diff;
  }

  return a.title.localeCompare(b.title);
}

export function getFilteredGardenOffers(
  gardenCards: OfferGardenCard[],
  filters: OfferFilters,
): FilteredOffers {
  const gardens = gardenCards
    .map((gardenCard) => {
      const filtered = filterOffers(gardenCard.offers, filters);
      if (filtered.length === 0) {
        return null;
      }

      return {
        ...gardenCard,
        offers: sortOffers(filtered, filters.sort),
      };
    })
    .filter((gardenCard): gardenCard is OfferGardenCard => Boolean(gardenCard))
    .sort((a, b) => compareGardenCards(a, b, filters.sort));

  return {
    gardens,
    offersCount: gardens.reduce((count, garden) => count + garden.offers.length, 0),
  };
}
