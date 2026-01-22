/* eslint-disable */
// this function comes from the tanstack table docs
// https://tanstack.com/table/v8/docs/guide/fuzzy-filtering#defining-a-custom-fuzzy-filter-function
import {
  sortingFns,
  type FilterFn,
  type SortingFn,
  type Table,
} from "@tanstack/react-table";
import {
  compareItems,
  rankItem,
  type RankingInfo,
  rankings,
} from "@tanstack/match-sorter-utils";
import type { ColumnDef } from "@tanstack/react-table";

interface FilterMetaWithRank {
  itemRank: RankingInfo;
}

// Normalizes text for fuzzy matching:
// - NFKD decomposes accents, then strip combining marks
// - Unify apostrophes (’, ', ʼ, ', ', ` -> ')
// - Normalize dashes (‐–—―− -> -)
// - Remove zero-width chars
// - Collapse internal whitespace, lowercase, trim
export const normalizeForSearch = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019\u2018\u02BC\u2032\u00B4\u0060\u0091\u0092]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en")
    .trim();

/**
 * Fuzzy filter function that ranks items and stores ranking info in meta
 */
export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Get the raw value
  const rawValue = row.getValue(columnId);
  if (rawValue == null || rawValue === "") return false;

  // Normalize both the data value and search value for consistent matching
  const normalizedData = normalizeForSearch(String(rawValue));
  const normalizedValue = normalizeForSearch(value);

  // If normalized search value is empty, no match
  if (!normalizedValue) return false;

  // Rank the item
  const itemRank = rankItem(normalizedData, normalizedValue, {
    threshold: rankings.CONTAINS,
  });

  // Store the ranking info for use in sorting
  addMeta({
    itemRank,
  });

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

// Global fuzzy filter that searches across selected columns.
// Keep the existing list or derive from column meta if you have it;
// minimal change here: compute normalizedValue once.
export const fuzzyGlobalFilter: FilterFn<any> = (
  row,
  _columnId,
  value,
  addMeta,
) => {
  const searchableColumns = [
    "title",
    "description",
    "privateNote",
    "price",
    "summary",
    "name",
    "hybridizer",
    "year",
    "scapeHeight",
    "bloomSize",
    "bloomSeason",
    "ploidy",
    "foliageType",
    "color",
    "form",
    "fragrance",
    "budcount",
    "branches",
  ];

  const normalizedValue = normalizeForSearch(value);
  if (!normalizedValue) return false;

  let bestRank: RankingInfo | null = null;
  for (const colId of searchableColumns) {
    const raw = row.getValue(colId);
    if (raw == null || raw === "") continue;
    const normalizedData = normalizeForSearch(String(raw));
    const itemRank = rankItem(normalizedData, normalizedValue, {
      threshold: rankings.CONTAINS,
    });
    if (itemRank.passed && (!bestRank || compareItems(itemRank, bestRank) > 0))
      bestRank = itemRank;
  }
  if (bestRank) {
    addMeta({ itemRank: bestRank });
    return true;
  }
  return false;
};

/**
 * Fuzzy sort function that prioritizes:
 * 1. Title matches first
 * 2. Then by match ranking quality
 * 3. Falls back to alphanumeric sorting
 */
export const fuzzySort: SortingFn<any> = (rowA, rowB, columnId) => {
  let dir = 0;

  // Get the global filter value
  const globalFilter = (rowA as any).table?.getState().globalFilter as string;

  if (globalFilter) {
    // Check title matches first
    const titleA = rowA.getValue("title") as string;
    const titleB = rowB.getValue("title") as string;

    if (titleA || titleB) {
      const normalizedGlobalFilter = normalizeForSearch(globalFilter);
      const titleARank = rankItem(
        normalizeForSearch(titleA || ""),
        normalizedGlobalFilter,
      );
      const titleBRank = rankItem(
        normalizeForSearch(titleB || ""),
        normalizedGlobalFilter,
      );

      // If one has a title match and the other doesn't, prioritize the title match
      if (titleARank.passed !== titleBRank.passed) {
        return titleARank.passed ? 1 : -1;
      }

      // If both match in title, compare their ranking scores
      if (titleARank.passed && titleBRank.passed) {
        const titleCompare = compareItems(titleARank, titleBRank);
        if (titleCompare !== 0) return titleCompare;
      }
    }
  }

  // If no title matches or they're equal, use the column's ranking information
  if (rowA.columnFiltersMeta[columnId]) {
    const metaA = rowA.columnFiltersMeta[columnId] as FilterMetaWithRank;
    const metaB = rowB.columnFiltersMeta[columnId] as FilterMetaWithRank;
    dir = compareItems(metaA.itemRank, metaB.itemRank);
  }

  // Provide an alphanumeric fallback for when the item ranks are equal
  return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
};

export function hasSelectedRows<TData>(table: Table<TData>): boolean {
  return table.getFilteredSelectedRowModel().rows.length > 0;
}

export function getFilterableColumnIds<TData>(
  columns: ColumnDef<TData, unknown>[],
): string[] {
  return columns
    .filter((column) => column.id && column.filterFn)
    .map((column) => column.id!);
}

export function resetTableState<TData>(
  table: Table<TData>,
  options?: {
    keepColumnFilters?: boolean;
    keepGlobalFilter?: boolean;
    keepPagination?: boolean;
    keepSorting?: boolean;
  },
) {
  const {
    keepColumnFilters = false,
    keepGlobalFilter = false,
    keepPagination = false,
    keepSorting = false,
  } = options ?? {};

  if (!keepColumnFilters) {
    table.resetColumnFilters(true);
  }
  if (!keepGlobalFilter) {
    table.resetGlobalFilter(true);
  }
  if (!keepPagination) {
    table.resetPageIndex(true);
  }
  if (!keepSorting) {
    table.resetSorting(true);
  }
}
