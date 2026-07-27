"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { fuzzyFilter } from "@/lib/table-utils";
import {
  matchesExactValue,
  matchesFormFacetValue,
  matchesNumericRange,
  matchesTextContains,
} from "./public-catalog-search-filter-utils";
import { type PublicCatalogListing } from "./public-catalog-search-types";

export interface CatalogSearchListingRow {
  ahsListing: {
    awardNames?: string | null;
    bloomHabit?: string | null;
    bloomSeason?: string | null;
    bloomSize?: number | string | null;
    branches?: number | string | null;
    budcount?: number | string | null;
    color?: string | null;
    foliageType?: string | null;
    flowerShow?: string | null;
    form?: string | null;
    fragrance?: string | null;
    hybridizer?: string | null;
    parentage?: string | null;
    ploidy?: string | null;
    scapeHeight?: number | string | null;
    sculptedTypes?: string | null;
    year?: number | string | null;
  } | null;
  cultivarReference: {
    ahsListing?: { name?: string | null } | null;
    normalizedName?: string | null;
  } | null;
  description: string | null;
  images: readonly unknown[];
  lists: ReadonlyArray<{ id: string; title: string }>;
  price: number | null;
  title: string;
}

export function createPublicCatalogSearchColumns<
  TListing extends CatalogSearchListingRow,
>() {
  const textContainsFilter: FilterFn<TListing> = (row, id, value) =>
    matchesTextContains(row.getValue(id), value);

  const exactMatchFilter: FilterFn<TListing> = (row, id, value) =>
    matchesExactValue(row.getValue(id), value);

  const textOrExactFacetFilter: FilterFn<TListing> = (row, id, value) =>
    Array.isArray(value)
      ? matchesExactValue(row.getValue(id), value)
      : matchesTextContains(row.getValue(id), value);

  const formFacetFilter: FilterFn<TListing> = (row, id, value) =>
    matchesFormFacetValue(row.getValue(id), value);

  const numericRangeFilter: FilterFn<TListing> = (row, id, value) =>
    matchesNumericRange(row.getValue(id), value);

  const titleFilter: FilterFn<TListing> = (...args) => fuzzyFilter(...args);

  const priceToggleFilter: FilterFn<TListing> = (row, id, value) => {
    const isEnabled = value === true || value === "true" || value === "1";
    if (!isEnabled) {
      return true;
    }

    const price = row.getValue(id);
    return typeof price === "number" && price > 0;
  };

  const hasPhotoFilter: FilterFn<TListing> = (row, _, value) => {
    const isEnabled = value === true || value === "true" || value === "1";
    if (!isEnabled) {
      return true;
    }

    return row.original.images.length > 0;
  };

  const booleanToggleFilter: FilterFn<TListing> = (row, id, value) => {
    const isEnabled = value === true || value === "true" || value === "1";
    if (!isEnabled) {
      return true;
    }

    return Boolean(row.getValue(id));
  };

  const listFacetFilter: FilterFn<TListing> = (row, _, value) => {
    if (!Array.isArray(value) || value.length === 0) {
      return true;
    }

    const selectedListIds = value as string[];

    return row.original.lists.some((list) => selectedListIds.includes(list.id));
  };

  return [
    {
      id: "title",
      accessorKey: "title",
      filterFn: titleFilter,
      sortingFn: "fuzzySort",
      enableSorting: true,
      enableHiding: false,
    },
    {
      id: "description",
      accessorKey: "description",
      filterFn: textContainsFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "price",
      accessorFn: (row) => row.price ?? null,
      filterFn: priceToggleFilter,
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "priceValue",
      accessorFn: (row) => row.price ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "lists",
      accessorFn: (row) => row.lists.map((list) => list.title).join(", "),
      filterFn: listFacetFilter,
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "cultivarName",
      accessorFn: (row) =>
        row.cultivarReference?.ahsListing?.name ??
        row.cultivarReference?.normalizedName ??
        null,
      filterFn: textContainsFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "linkedToCultivar",
      accessorFn: (row) => row.cultivarReference !== null,
      filterFn: booleanToggleFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "hasPhoto",
      accessorFn: (row) => row.images.length > 0,
      filterFn: hasPhotoFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "hybridizer",
      accessorFn: (row) => row.ahsListing?.hybridizer ?? null,
      filterFn: textOrExactFacetFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "award",
      accessorFn: (row) => row.ahsListing?.awardNames ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "year",
      accessorFn: (row) => row.ahsListing?.year ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "bloomHabit",
      accessorFn: (row) => row.ahsListing?.bloomHabit ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "bloomSeason",
      accessorFn: (row) => row.ahsListing?.bloomSeason ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "scapeHeight",
      accessorFn: (row) => row.ahsListing?.scapeHeight ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "bloomSize",
      accessorFn: (row) => row.ahsListing?.bloomSize ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "budcount",
      accessorFn: (row) => row.ahsListing?.budcount ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "branches",
      accessorFn: (row) => row.ahsListing?.branches ?? null,
      filterFn: numericRangeFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "form",
      accessorFn: (row) => row.ahsListing?.form ?? null,
      filterFn: formFacetFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "flowerShow",
      accessorFn: (row) => row.ahsListing?.flowerShow ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "sculptedType",
      accessorFn: (row) => row.ahsListing?.sculptedTypes ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "ploidy",
      accessorFn: (row) => row.ahsListing?.ploidy ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "foliageType",
      accessorFn: (row) => row.ahsListing?.foliageType ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "fragrance",
      accessorFn: (row) => row.ahsListing?.fragrance ?? null,
      filterFn: exactMatchFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "color",
      accessorFn: (row) => row.ahsListing?.color ?? null,
      filterFn: textContainsFilter,
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "parentage",
      accessorFn: (row) => row.ahsListing?.parentage ?? null,
      filterFn: textContainsFilter,
      enableSorting: false,
      enableHiding: true,
    },
  ] satisfies ColumnDef<TListing>[];
}

export const publicCatalogSearchColumns =
  createPublicCatalogSearchColumns<PublicCatalogListing>();
