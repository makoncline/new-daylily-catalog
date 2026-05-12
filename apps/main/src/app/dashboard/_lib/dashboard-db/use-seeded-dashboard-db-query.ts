"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { QueryKey } from "@tanstack/react-query";
import type {
  Context,
  InitialQueryBuilder,
  QueryBuilder,
} from "@tanstack/react-db";
import { getQueryClient } from "@/trpc/query-client";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

interface UseSeededDashboardDbQueryArgs<TContext extends Context = Context> {
  debugLabel?: string;
  deps?: readonly unknown[];
  query: (q: InitialQueryBuilder) => QueryBuilder<TContext>;
  queryKey: QueryKey;
}

export function useSeededDashboardDbQuery<
  TItem extends object,
  TContext extends Context = Context,
>({
  debugLabel,
  deps,
  query,
  queryKey,
}: UseSeededDashboardDbQueryArgs<TContext>) {
  const [liveQueryEnabled, setLiveQueryEnabled] = useState(false);
  const readyLoggedRef = useRef(false);
  const liveQueryDeps = deps
    ? ([liveQueryEnabled, ...deps] as unknown[])
    : ([liveQueryEnabled] as unknown[]);
  const { data: liveData = [], isReady } = useLiveQuery(
    (q) => (liveQueryEnabled ? query(q) : undefined),
    liveQueryDeps,
  );
  const seededData = getQueryClient().getQueryData<TItem[]>(queryKey) ?? [];
  const hasLiveData = liveQueryEnabled && isReady;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLiveQueryEnabled(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!debugLabel || !hasLiveData || readyLoggedRef.current) return;

    readyLoggedRef.current = true;
    logDashboardTiming("seeded-query.ready", {
      query: debugLabel,
      liveRows: liveData.length,
      seededRows: seededData.length,
    });
  }, [debugLabel, hasLiveData, liveData.length, seededData.length]);

  return {
    data: hasLiveData ? (liveData as TItem[]) : seededData,
    isReady: hasLiveData || seededData.length > 0,
    liveData: liveData as TItem[],
    seededData,
  };
}
