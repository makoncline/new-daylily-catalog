"use client";

import {
  cursorKey,
  getCurrentUserId,
  setCurrentUserId,
} from "@/lib/utils/cursor";
import { getQueryClient } from "@/trpc/query-client";

type HasUpdatedAt = {
  updatedAt: Date;
};

export function writeCursorFromRows(args: {
  cursorStorageKey: string;
  rows: readonly HasUpdatedAt[];
}) {
  if (args.rows.length === 0) return;

  let max = args.rows[0]!.updatedAt;
  for (let i = 1; i < args.rows.length; i++) {
    const next = args.rows[i]!.updatedAt;
    if (next > max) max = next;
  }

  localStorage.setItem(args.cursorStorageKey, max.toISOString());
}

export function replaceDashboardDbCollectionRows<T extends HasUpdatedAt>(args: {
  userId: string;
  queryKey: readonly unknown[];
  cursorBase: string;
  rows: readonly T[];
  sortRows: (rows: readonly T[]) => T[];
  filterRows?: (row: T) => boolean;
}) {
  const visibleRows = args.filterRows
    ? args.rows.filter(args.filterRows)
    : args.rows;

  getQueryClient().setQueryData(args.queryKey, args.sortRows(visibleRows));

  const cursorStorageKey = cursorKey(args.cursorBase, args.userId);
  if (args.rows.length === 0) {
    localStorage.removeItem(cursorStorageKey);
    return;
  }

  writeCursorFromRows({
    cursorStorageKey,
    rows: args.rows,
  });
}

export async function refreshDashboardDbCollectionFromServer<
  T extends HasUpdatedAt,
>(args: {
  userId: string;
  queryKey: readonly unknown[];
  cursorBase: string;
  fetchRows: () => Promise<readonly T[]>;
  sortRows: (rows: readonly T[]) => T[];
  filterRows?: (row: T) => boolean;
}) {
  setCurrentUserId(args.userId);
  const rows = await args.fetchRows();

  if (getCurrentUserId() !== args.userId) {
    return false;
  }

  replaceDashboardDbCollectionRows({
    userId: args.userId,
    queryKey: args.queryKey,
    cursorBase: args.cursorBase,
    rows,
    sortRows: args.sortRows,
    filterRows: args.filterRows,
  });

  return true;
}
