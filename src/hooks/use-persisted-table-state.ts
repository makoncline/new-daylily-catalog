"use client";

import type { Table } from "@tanstack/react-table";
import {
  useLocalStorageInitialTableState,
  useTableLocalStorageSync,
} from "./use-table-local-storage-sync";
import { useTableUrlSync, useUrlInitialTableState } from "./use-table-url-sync";

export function useInitialPersistedTableState(args: {
  filterableColumnIds?: string[];
  storageKey: string;
}) {
  const urlState = useUrlInitialTableState({
    filterableColumnIds: args.filterableColumnIds,
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
