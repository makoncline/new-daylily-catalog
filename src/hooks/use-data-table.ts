"use client";

import {
  type Table,
  useReactTable,
  type ColumnDef,
  type TableOptions,
} from "@tanstack/react-table";
import { defaultTableConfig } from "@/lib/table-config";
import { getFilterableColumnIds } from "@/lib/table-utils";
import { useTableUrlSync, useUrlInitialTableState } from "./use-table-url-sync";
import {
  useTableLocalStorageSync,
  useLocalStorageInitialTableState,
} from "./use-table-local-storage-sync";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";

interface UseDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  storageKey: string;
  pinnedColumns?: {
    left?: string[];
    right?: string[];
  };
  config?: Partial<TableOptions<TData>>;
  columnNames?: Record<string, string>;
}

export function useDataTable<TData>({
  data,
  columns,
  storageKey,
  pinnedColumns = { left: [], right: [] },
  config,
  columnNames = LISTING_TABLE_COLUMN_NAMES,
}: UseDataTableProps<TData>): Table<TData> {
  const filterableColumnIds = getFilterableColumnIds(columns);
  const defaultColumnOrder = columns.map((column) => column.id!);

  // Get initial state from URL and local storage
  const urlState = useUrlInitialTableState({ filterableColumnIds });
  const localStorageState = useLocalStorageInitialTableState({ storageKey });

  // Merge states, prioritizing URL state for filters and pagination
  const initialState = {
    // Start with local storage state as base
    ...localStorageState,
    // Override with URL state for filters and pagination
    ...urlState,
    // Keep column order from local storage
    columnOrder: localStorageState.columnOrder ?? defaultColumnOrder,
    // Set sorting based on global filter
    sorting: urlState.globalFilter ? [{ id: "title", desc: false }] : [],
  };

  const table = useReactTable<TData>({
    ...defaultTableConfig<TData>(),
    data,
    columns,
    meta: {
      filterableColumns: filterableColumnIds,
      storageKey,
      pinnedColumns,
      getColumnLabel: (columnId) => columnNames[columnId] ?? columnId,
    },
    initialState,
    ...config,
  });

  // Sync table state
  const state = table.getState();
  useTableUrlSync(table);
  useTableLocalStorageSync(state);

  return table;
}
