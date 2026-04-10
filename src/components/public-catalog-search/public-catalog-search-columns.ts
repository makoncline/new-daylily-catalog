"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { fuzzyFilter } from "@/lib/table-utils";
import { matchesExactValue, matchesNumericRange, matchesTextContains } from "./public-catalog-search-filter-utils";
import { type PublicCatalogListing } from "./public-catalog-search-types";

const textContainsFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesTextContains(row.getValue(id), value);

const exactMatchFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesExactValue(row.getValue(id), value);

const numericRangeFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesNumericRange(row.getValue(id), value);

const titleFilter: FilterFn<PublicCatalogListing> = (...args) =>
  fuzzyFilter(...args);

const priceToggleFilter: FilterFn<PublicCatalogListing> = (row, id, value) => {
  const isEnabled = value === true || value === "true" || value === "1";
  if (!isEnabled) {
    return true;
  }

  const price = row.getValue(id);
  return typeof price === "number" && price > 0;
};

const hasPhotoFilter: FilterFn<PublicCatalogListing> = (row, _, value) => {
  const isEnabled = value === true || value === "true" || value === "1";
  if (!isEnabled) {
    return true;
  }

  return row.original.images.length > 0;
};

const booleanToggleFilter: FilterFn<PublicCatalogListing> = (
  row,
  id,
  value,
) => {
  const isEnabled = value === true || value === "true" || value === "1";
  if (!isEnabled) {
    return true;
  }

  return Boolean(row.getValue(id));
};

const listFacetFilter: FilterFn<PublicCatalogListing> = (row, _, value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return true;
  }

  const selectedListIds = value as string[];

  return row.original.lists.some((list) =>
    selectedListIds.includes(list.id),
  );
};

export const publicCatalogSearchColumns = [
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
    filterFn: textContainsFilter,
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
] satisfies ColumnDef<PublicCatalogListing>[];
