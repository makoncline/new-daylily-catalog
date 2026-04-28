"use client";

import { cursorKey, getCurrentUserId } from "@/lib/utils/cursor";
import { getQueryClient } from "@/trpc/query-client";

type HasUpdatedAt = {
  updatedAt: Date;
};

type HasSyncPageCursor = {
  id: string;
};

export interface DashboardSyncPageCursor {
  id: string;
}

export interface DashboardSyncPageInput {
  cursor?: DashboardSyncPageCursor;
  limit?: number;
  since: string | null;
}

interface BootstrapDashboardDbCollectionArgs<T extends HasUpdatedAt> {
  userId: string;
  queryKey: readonly unknown[];
  cursorBase: string;
  collection: {
    preload: () => Promise<void>;
  };
  fetchSeed: () => Promise<readonly T[]>;
  onSeeded?: () => void;
}

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

export async function fetchDashboardSyncPages<
  T extends HasSyncPageCursor,
>(args: {
  fetchPage: (input: DashboardSyncPageInput) => Promise<readonly T[]>;
  pageSize?: number;
  since: string | null;
}) {
  const pageSize = args.pageSize ?? 100;
  const rows: T[] = [];
  let cursor: DashboardSyncPageCursor | undefined;

  if (args.since !== null) {
    return [...(await args.fetchPage({ since: args.since }))];
  }

  for (;;) {
    const page = await args.fetchPage({
      cursor,
      limit: pageSize,
      since: args.since,
    });

    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    const last = page[page.length - 1]!;
    if (cursor?.id === last.id) {
      throw new Error("Dashboard sync cursor did not advance");
    }

    cursor = { id: last.id };
  }
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
  if (getCurrentUserId() !== args.userId) {
    return false;
  }

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

export async function bootstrapDashboardDbCollection<T extends HasUpdatedAt>(
  args: BootstrapDashboardDbCollectionArgs<T>,
) {
  if (getCurrentUserId() !== args.userId) {
    return false;
  }

  const rows = await args.fetchSeed();

  if (getCurrentUserId() !== args.userId) {
    return false;
  }

  replaceDashboardDbCollectionRows({
    userId: args.userId,
    queryKey: args.queryKey,
    cursorBase: args.cursorBase,
    rows,
    sortRows: (nextRows) => [...nextRows],
  });

  args.onSeeded?.();
  await args.collection.preload();
  return true;
}
