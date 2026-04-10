"use client";

import {
  type Table,
  useReactTable,
  type ColumnDef,
  type TableOptions,
} from "@tanstack/react-table";
import { defaultTableConfig } from "@/lib/table-config";
import { getFilterableColumnIds } from "@/lib/table-utils";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import {
  useInitialPersistedTableState,
  useSyncPersistedTableState,
} from "./use-persisted-table-state";

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

  const persistedState = useInitialPersistedTableState({
    filterableColumnIds,
    storageKey,
  });

  // TanStack Table's hook intentionally returns mutable APIs; React Compiler warning is expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
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
      sorting: persistedState.globalFilter
        ? [{ id: "title", desc: false }]
        : [],
      ...initialStateOverrides,
      ...persistedState,
    },
    autoResetPageIndex: false,
    ...config,
  });

  useSyncPersistedTableState(table);

  return table;
}
