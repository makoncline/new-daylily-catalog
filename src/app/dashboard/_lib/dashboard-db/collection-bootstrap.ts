"use client";

import { setCurrentUserId } from "@/lib/utils/cursor";
import { getQueryClient } from "@/trpc/query-client";

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

export async function bootstrapDashboardDbCollection(args: {
  userId: string;
  collection: PreloadableCollection;
  queryKey: readonly unknown[];
  cursorStorageKey: string;
  beforePreload?: () => void;
}) {
  setCurrentUserId(args.userId);
  if (getQueryClient().getQueryData(args.queryKey) === undefined) {
    localStorage.removeItem(args.cursorStorageKey);
  }
  args.beforePreload?.();
  await args.collection.preload();
}
