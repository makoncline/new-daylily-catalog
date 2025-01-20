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

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint, @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends unknown> {
    filterableColumns?: string[];
    storageKey?: string;
  }
}

export const defaultTableConfig = <TData>() =>
  ({
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    sortingFns: {
      fuzzySort,
    },
    getCoreRowModel: getCoreRowModel<TData>(),
    getFilteredRowModel: getFilteredRowModel<TData>(),
    getPaginationRowModel: getPaginationRowModel<TData>(),
    getSortedRowModel: getSortedRowModel<TData>(),
    getFacetedRowModel: getFacetedRowModel<TData>(),
    getFacetedUniqueValues: getFacetedUniqueValues<TData>(),
    globalFilterFn: "fuzzy" as const,
  }) satisfies Partial<TableOptions<TData>>;

export const DEFAULT_TABLE_OPTIONS = {
  pinnedColumns: {
    left: [],
    right: [],
  },
  storageKey: "data-table",
} as const;
