import { type FilterFn } from "@tanstack/react-table";
import { type RouterOutputs } from "@/trpc/react";
import type { ImageCollectionItem } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  matchesExactValue,
  matchesFormFacetValue,
  matchesNumericRange,
  matchesTextContains,
} from "@/components/public-catalog-search/public-catalog-search-filter-utils";

interface ListingListRef {
  id: string;
  title: string;
}

type ListingBase = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];
type CultivarReferenceAhsListing = CultivarReference["ahsListing"];
type CultivarReferenceImage = CultivarReference["cultivarReferenceImage"];

export type ListingData = ListingBase & {
  images: ImageCollectionItem[];
  lists: ListingListRef[];
  ahsListing: CultivarReferenceAhsListing | null;
  cultivarReferenceImage: CultivarReferenceImage | null;
  cultivarReferenceNormalizedName: string | null;
};

export const textContainsFilter: FilterFn<ListingData> = (row, id, value) =>
  matchesTextContains(row.getValue(id), value);

export const exactMatchFilter: FilterFn<ListingData> = (row, id, value) =>
  matchesExactValue(row.getValue(id), value);

export const formFacetFilter: FilterFn<ListingData> = (row, id, value) =>
  matchesFormFacetValue(row.getValue(id), value);

export const numericRangeFilter: FilterFn<ListingData> = (row, id, value) =>
  matchesNumericRange(row.getValue(id), value);

const isEnabledFilter = (value: unknown) =>
  value === true || value === "true" || value === "1";

export const priceToggleFilter: FilterFn<ListingData> = (row, id, value) => {
  if (!isEnabledFilter(value)) return true;

  const price = row.getValue(id);
  return typeof price === "number" && price > 0;
};

export const hasPhotoFilter: FilterFn<ListingData> = (row, _, value) => {
  if (!isEnabledFilter(value)) return true;

  return (
    row.original.images.length > 0 ||
    Boolean(row.original.cultivarReferenceImage)
  );
};

export const booleanToggleFilter: FilterFn<ListingData> = (row, id, value) => {
  if (!isEnabledFilter(value)) return true;

  return Boolean(row.getValue(id));
};
