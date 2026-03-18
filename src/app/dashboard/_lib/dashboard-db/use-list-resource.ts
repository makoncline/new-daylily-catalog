"use client";

import { eq } from "@tanstack/react-db";
import { DASHBOARD_DB_QUERY_KEYS } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useSeededDashboardDbQuery } from "@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query";

export interface UseListResourceResult {
  isReady: boolean;
  list: ListCollectionItem | null;
}

export function useListResource(listId: string): UseListResourceResult {
  const { data: lists = [], isReady } = useSeededDashboardDbQuery<ListCollectionItem>({
    deps: [listId],
    query: (q) =>
      q.from({ list: listsCollection }).where(({ list }) => eq(list.id, listId)),
    queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  });

  return {
    isReady,
    list: lists[0] ?? null,
  };
}
