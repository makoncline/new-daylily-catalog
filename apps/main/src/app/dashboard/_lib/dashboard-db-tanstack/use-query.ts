"use client";

import {
  useLiveSuspenseQuery,
  type Context,
  type InitialQueryBuilder,
  type QueryBuilder,
} from "@tanstack/react-db";
import type { QueryKey } from "@tanstack/react-query";

// Preserve the view's query interface; TanStack DB supplies every rendered row.
export function useSeededDashboardDbQuery<
  TItem extends object,
  TContext extends Context = Context,
>({
  query,
}: {
  query: (q: InitialQueryBuilder) => QueryBuilder<TContext>;
  debugLabel?: string;
  queryKey: QueryKey;
}) {
  const { data } = useLiveSuspenseQuery({ query });
  return { data: data as TItem[], isReady: true };
}
