import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type TableOptions,
} from "@tanstack/react-table";
import { fuzzyFilter, fuzzySort } from "@/lib/table-utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint, @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends unknown> {
    filterableColumns?: string[];
    storageKey?: string;
  }
}

/**
 * Default table configuration with fuzzy filtering and sorting
 */
export const defaultTableConfig = <TData>() =>
  ({
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    globalFilterFn: "fuzzy" as const,
    sortingFns: {
      fuzzySort,
    },
    getCoreRowModel: getCoreRowModel<TData>(),
    getFilteredRowModel: getFilteredRowModel<TData>(),
    getPaginationRowModel: getPaginationRowModel<TData>(),
    getSortedRowModel: getSortedRowModel<TData>(),
    getFacetedRowModel: getFacetedRowModel<TData>(),
    getFacetedUniqueValues: getFacetedUniqueValues<TData>(),
  }) satisfies Partial<TableOptions<TData>>;

export const DEFAULT_TABLE_OPTIONS = {
  pinnedColumns: {
    left: [],
    right: [],
  },
  storageKey: "data-table",
} as const;
