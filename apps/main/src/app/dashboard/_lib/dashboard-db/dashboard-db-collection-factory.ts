"use client";

import { createCollection } from "@tanstack/react-db";
import type { Collection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryCollectionUtils } from "@tanstack/query-db-collection";
import type { QueryKey } from "@tanstack/react-query";
import { getQueryClient } from "@/trpc/query-client";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  replaceDashboardDbCollectionRows,
  writeCursorFromRows,
} from "./collection-bootstrap";

interface DashboardDbCollectionItem {
  id: string;
  updatedAt: Date;
}

export interface CreateDashboardDbCollectionArgs<TItem extends DashboardDbCollectionItem> {
  cursorBase: string;
  getKey: (row: TItem) => string;
  queryKey: QueryKey;
  seed: (userId: string) => Promise<TItem[]>;
  sync: (since: string | null) => Promise<TItem[]>;
  onSeeded?: () => void;
}

export function createDashboardDbCollection<TItem extends DashboardDbCollectionItem>(
  args: CreateDashboardDbCollectionArgs<TItem>,
) {
  const deletedIds = new Set<string>();
  const collectionOptions = queryCollectionOptions<TItem>({
    queryClient: getQueryClient(),
    queryKey: args.queryKey,
    enabled: true,
    getKey: args.getKey,
    queryFn: async ({ queryKey }) => {
      const existing: TItem[] = getQueryClient().getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(args.cursorBase);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await args.sync(last ?? null);

      const map = new Map(existing.map((row) => [args.getKey(row), row]));
      upserts.forEach((row) => map.set(args.getKey(row), row));
      deletedIds.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  });

  const collection = createCollection(
    collectionOptions as unknown as Parameters<typeof createCollection>[0],
  ) as unknown as Collection<TItem, string | number, QueryCollectionUtils<TItem>>;

  async function initialize(userId: string) {
    const rows = await args.seed(userId);

    replaceDashboardDbCollectionRows({
      userId,
      queryKey: args.queryKey,
      cursorBase: args.cursorBase,
      rows,
      sortRows: (nextRows) => [...nextRows],
    });

    deletedIds.clear();
    args.onSeeded?.();
    await collection.preload();
  }

  return {
    collection,
    deletedIds,
    initialize,
  };
}
