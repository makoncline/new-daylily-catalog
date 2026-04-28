"use client";

import { useLiveQuery } from "@tanstack/react-db";
import type { QueryKey } from "@tanstack/react-query";
import type {
  Context,
  InitialQueryBuilder,
  QueryBuilder,
} from "@tanstack/react-db";
import { getQueryClient } from "@/trpc/query-client";

interface UseSeededDashboardDbQueryArgs<TContext extends Context = Context> {
  deps?: readonly unknown[];
  query: (q: InitialQueryBuilder) => QueryBuilder<TContext>;
  queryKey: QueryKey;
}

export function useSeededDashboardDbQuery<
  TItem extends object,
  TContext extends Context = Context,
>({
  deps,
  query,
  queryKey,
}: UseSeededDashboardDbQueryArgs<TContext>) {
  const liveQueryDeps = deps ? [...deps] : undefined;
  const { data: liveData = [], isReady } = useLiveQuery(query, liveQueryDeps);
  const seededData = getQueryClient().getQueryData<TItem[]>(queryKey) ?? [];

  return {
    data: isReady ? (liveData as TItem[]) : seededData,
    isReady,
    liveData: liveData as TItem[],
    seededData,
  };
}
