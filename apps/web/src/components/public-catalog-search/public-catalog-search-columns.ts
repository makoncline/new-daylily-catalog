"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import {
  matchesExactValue,
  matchesNumericRange,
  matchesTextContains,
} from "./public-catalog-search-filter-utils";
import { type PublicCatalogListing } from "./public-catalog-search-types";

const textContainsFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesTextContains(row.getValue(id), value);

const exactMatchFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesExactValue(row.getValue(id), value);

const numericRangeFilter: FilterFn<PublicCatalogListing> = (row, id, value) =>
  matchesNumericRange(row.getValue(id), value);

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
  if (!isEnabled) return true;
  return Boolean(row.getValue(id));
};

const additionalFilters: Record<string, FilterFn<PublicCatalogListing>> = {
  hasPhoto: hasPhotoFilter,
  description: textContainsFilter,
  hybridizer: textContainsFilter,
  year: numericRangeFilter,
  bloomHabit: exactMatchFilter,
  bloomSeason: exactMatchFilter,
  scapeHeight: numericRangeFilter,
  bloomSize: numericRangeFilter,
  budcount: numericRangeFilter,
  branches: numericRangeFilter,
  form: exactMatchFilter,
  ploidy: exactMatchFilter,
  foliageType: exactMatchFilter,
  fragrance: exactMatchFilter,
  color: textContainsFilter,
  parentage: textContainsFilter,
};

function enhanceColumnFilter(
  column: ColumnDef<PublicCatalogListing>,
): ColumnDef<PublicCatalogListing> {
  if (!column.id) {
    return column;
  }

  const filterFn = additionalFilters[column.id];
  if (!filterFn) {
    return column;
  }

  return {
    ...column,
    filterFn,
  };
}

export const publicCatalogSearchColumns = [
  ...(baseListingColumns as ColumnDef<PublicCatalogListing>[]).map(
    enhanceColumnFilter,
  ),
  {
    id: "parentage",
    accessorFn: (row) => row.ahsListing?.parentage ?? null,
    filterFn: textContainsFilter,
    enableSorting: false,
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
    id: "priceValue",
    accessorFn: (row) => row.price ?? null,
    filterFn: numericRangeFilter,
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
] satisfies ColumnDef<PublicCatalogListing>[];
