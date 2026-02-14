"use client";

import { getQueryClient } from "@/trpc/query-client";
import { cursorKey, setCurrentUserId } from "@/lib/utils/cursor";

type PreloadableCollection = {
  preload: () => Promise<void>;
};

export async function bootstrapDashboardDbCollection<TItem>(args: {
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

  localStorage.setItem(
    cursorKey(args.cursorBase, args.userId),
    new Date().toISOString(),
  );

  args.onSeeded?.();

  await args.collection.preload();
}

