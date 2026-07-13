"use client";

import type { Table } from "@tanstack/react-table";
import {
  useLocalStorageInitialTableState,
  useTableLocalStorageSync,
} from "./use-table-local-storage-sync";
import { useTableUrlSync, useUrlInitialTableState } from "./use-table-url-sync";

export function useInitialPersistedTableState(args: {
  filterableColumnIds?: string[];
  sortableColumnIds?: string[];
  storageKey: string;
}) {
  const urlState = useUrlInitialTableState({
    filterableColumnIds: args.filterableColumnIds,
    sortableColumnIds: args.sortableColumnIds,
  });
  const localStorageState = useLocalStorageInitialTableState({
    storageKey: args.storageKey,
  });

  return {
    ...urlState,
    ...localStorageState,
  };
}

export function useSyncPersistedTableState<TData>(table: Table<TData>) {
  useTableUrlSync(table);
  useTableLocalStorageSync(table.getState());
}
