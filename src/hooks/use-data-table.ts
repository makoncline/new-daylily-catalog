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
  initialStateOverrides?: Partial<TableOptions<TData>> & {
    pagination?: {
      pageSize?: number;
    };
  };
}

export function useDataTable<TData>({
  data,
  columns,
  storageKey,
  pinnedColumns = { left: [], right: [] },
  initialStateOverrides,
  config,
  columnNames = LISTING_TABLE_COLUMN_NAMES,
}: UseDataTableProps<TData>): Table<TData> {
  const filterableColumnIds = getFilterableColumnIds(columns);

  // Get initial state from URL and local storage
  const urlState = useUrlInitialTableState({ filterableColumnIds });
  const localStorageState = useLocalStorageInitialTableState({ storageKey });

  const table = useReactTable<TData>({
    ...defaultTableConfig<TData>(),
    data,
    columns,
    meta: {
      filterableColumns: filterableColumnIds,
      storageKey,
      pinnedColumns,
      getColumnLabel: (columnId) =>
        (columnNames[columnId] as unknown as string) ?? columnId,
    },
    initialState: {
      sorting: urlState.globalFilter ? [{ id: "title", desc: false }] : [],
      ...initialStateOverrides,
      ...urlState,
      ...localStorageState,
    },
    autoResetPageIndex: false,
    ...config,
  });

  // Sync table state
  const state = table.getState();
  useTableUrlSync(table);
  useTableLocalStorageSync(state);

  return table;
}
