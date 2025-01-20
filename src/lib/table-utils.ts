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

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item with stricter threshold
  const itemRank = rankItem(row.getValue(columnId), value, {
    threshold: rankings.ACRONYM,
  });

  // Store the ranking info
  addMeta({
    itemRank,
  });

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

export const fuzzySort: SortingFn<any> = (rowA, rowB, columnId) => {
  let dir = 0;

  // Only sort by rank if both rows have ranking information
  const metaA = rowA.columnFiltersMeta[columnId] as FilterMetaWithRank;
  const metaB = rowB.columnFiltersMeta[columnId] as FilterMetaWithRank;

  if (metaA?.itemRank && metaB?.itemRank) {
    dir = compareItems(metaA.itemRank, metaB.itemRank);
  }

  // Provide an alphanumeric fallback for when the item ranks are equal or missing
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
