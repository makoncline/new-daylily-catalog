"use client";

import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/collections";

export interface UseListResourceResult {
  list: ListCollectionItem | null;
}

export function useListResource(listId: string): UseListResourceResult {
  const { data: lists } = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ list: listsCollection })
        .where(({ list }) => eq(list.id, listId)),
  });
  const list = lists[0] ?? null;

  return {
    list,
  };
}
