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
  syncUrl?: boolean;
}) {
  const urlState = useUrlInitialTableState({
    filterableColumnIds: args.filterableColumnIds,
  });
  const localStorageState = useLocalStorageInitialTableState({
    storageKey: args.storageKey,
  });

  return {
    ...(args.syncUrl === false ? {} : urlState),
    ...localStorageState,
  };
}

export function useSyncPersistedTableState<TData>(
  table: Table<TData>,
  syncUrl = true,
) {
  useTableUrlSync(table, syncUrl);
  useTableLocalStorageSync(table.getState());
}
