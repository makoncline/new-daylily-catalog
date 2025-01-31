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

/**
 * Fuzzy filter function that ranks items and stores ranking info in meta
 */
export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item with stricter threshold
  const itemRank = rankItem(row.getValue(columnId), value, {
    threshold: rankings.ACRONYM,
  });

  // Store the ranking info for use in sorting
  addMeta({
    itemRank,
  });

  // Return if the item should be filtered in/out
  return itemRank.passed;
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
      const titleARank = rankItem(titleA || "", globalFilter);
      const titleBRank = rankItem(titleB || "", globalFilter);

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
