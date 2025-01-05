/* eslint-disable */
// this function comes from the tanstack table docs
// https://tanstack.com/table/v8/docs/guide/fuzzy-filtering#defining-a-custom-fuzzy-filter-function
import type { FilterFn } from "@tanstack/react-table";
import { rankItem } from "@tanstack/match-sorter-utils";

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the ranking info
  addMeta(itemRank);

  // Return if the item should be filtered in/out
  return itemRank.passed;
};
