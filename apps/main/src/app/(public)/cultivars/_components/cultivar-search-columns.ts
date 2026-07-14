"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import type { PublicCultivarSearchResult } from "@/lib/public-cultivar-search";
import { fuzzyFilter } from "@/lib/table-utils";
import {
  matchesExactValue,
  matchesFormFacetValue,
  matchesNumericRange,
  matchesTextContains,
} from "@/components/public-catalog-search/public-catalog-search-filter-utils";

const textFilter: FilterFn<PublicCultivarSearchResult> = (row, id, value) =>
  matchesTextContains(row.getValue(id), value);
const exactFilter: FilterFn<PublicCultivarSearchResult> = (row, id, value) =>
  matchesExactValue(row.getValue(id), value);
const formFilter: FilterFn<PublicCultivarSearchResult> = (row, id, value) =>
  matchesFormFacetValue(row.getValue(id), value);
const rangeFilter: FilterFn<PublicCultivarSearchResult> = (row, id, value) =>
  matchesNumericRange(row.getValue(id), value);
const hasPhotoFilter: FilterFn<PublicCultivarSearchResult> = (
  row,
  _id,
  value,
) => !value || Boolean(row.original.imageUrl);

export const cultivarSearchColumns = [
  {
    id: "title",
    accessorKey: "name",
    filterFn: fuzzyFilter,
    sortingFn: "fuzzySort",
  },
  {
    id: "hybridizer",
    accessorKey: "hybridizer",
    filterFn: textFilter,
  },
  {
    id: "year",
    accessorKey: "year",
    filterFn: rangeFilter,
  },
  {
    id: "hasPhoto",
    accessorFn: (row) => Boolean(row.imageUrl),
    filterFn: hasPhotoFilter,
  },
  {
    id: "bloomHabit",
    accessorFn: (row) => row.ahsListing?.bloomHabit ?? null,
    filterFn: exactFilter,
  },
  {
    id: "bloomSeason",
    accessorFn: (row) => row.ahsListing?.bloomSeason ?? null,
    filterFn: exactFilter,
  },
  {
    id: "scapeHeight",
    accessorFn: (row) => row.ahsListing?.scapeHeight ?? null,
    filterFn: rangeFilter,
  },
  {
    id: "bloomSize",
    accessorFn: (row) => row.ahsListing?.bloomSize ?? null,
    filterFn: rangeFilter,
  },
  {
    id: "budcount",
    accessorFn: (row) => row.ahsListing?.budcount ?? null,
    filterFn: rangeFilter,
  },
  {
    id: "branches",
    accessorFn: (row) => row.ahsListing?.branches ?? null,
    filterFn: rangeFilter,
  },
  {
    id: "form",
    accessorFn: (row) => row.ahsListing?.form ?? null,
    filterFn: formFilter,
  },
  {
    id: "ploidy",
    accessorFn: (row) => row.ahsListing?.ploidy ?? null,
    filterFn: exactFilter,
  },
  {
    id: "foliageType",
    accessorFn: (row) => row.ahsListing?.foliageType ?? null,
    filterFn: exactFilter,
  },
  {
    id: "fragrance",
    accessorFn: (row) => row.ahsListing?.fragrance ?? null,
    filterFn: exactFilter,
  },
  {
    id: "color",
    accessorFn: (row) => row.ahsListing?.color ?? null,
    filterFn: textFilter,
  },
  {
    id: "parentage",
    accessorFn: (row) => row.ahsListing?.parentage ?? null,
    filterFn: textFilter,
  },
] satisfies ColumnDef<PublicCultivarSearchResult>[];
