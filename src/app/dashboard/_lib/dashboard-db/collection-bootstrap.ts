"use client";

import { getQueryClient } from "@/trpc/query-client";
import { cursorKey, setCurrentUserId } from "@/lib/utils/cursor";

type PreloadableCollection = {
  preload: () => Promise<void>;
};

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

export async function bootstrapDashboardDbCollection<TItem extends HasUpdatedAt>(args: {
  userId: string;
  queryKey: readonly unknown[];
  cursorBase: string;
  collection: PreloadableCollection;
  fetchSeed: () => Promise<TItem[]>;
  onSeeded?: () => void;
}) {
  setCurrentUserId(args.userId);

  const rows = await args.fetchSeed();
  getQueryClient().setQueryData<TItem[]>(args.queryKey, rows);

  writeCursorFromRows({
    cursorStorageKey: cursorKey(args.cursorBase, args.userId),
    rows,
  });

  args.onSeeded?.();

  await args.collection.preload();
}
