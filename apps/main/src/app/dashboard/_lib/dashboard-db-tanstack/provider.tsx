"use client";

import {
  createContext,
  use,
  useEffect,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { toast } from "sonner";
import { createDashboard } from "./collections";
import {
  DashboardDbLoadingScreen,
  type DashboardDbStatus,
} from "@/app/dashboard/_components/dashboard-db-loading-screen";
import { reportDashboardLoadFailure } from "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting";
import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

type State = {
  status: DashboardDbStatus;
  userId: string | null;
  isRefreshing: boolean;
};
type Dashboard = ReturnType<typeof createDashboard>;
const Context = createContext<State | null>(null);
export function useDashboardDb() {
  const state = use(Context);
  if (!state) throw new Error("Dashboard provider is missing");
  return state;
}

export function DashboardDbProvider({ children }: { children: ReactNode }) {
  const { userId: clerkUserId } = useAuth();
  const { data: user, isError } = useQuery({
    queryKey: ["dashboard-member", clerkUserId],
    queryFn: ({ signal }) =>
      getTrpcClient().dashboardDb.user.getCurrentUserId.query(undefined, {
        signal,
      }),
    enabled: Boolean(clerkUserId),
  });
  if (!user || !clerkUserId)
    return (
      <DashboardDbLoadingScreen
        status={isError ? "error" : "loading"}
        isExiting={false}
      />
    );
  return (
    <MemberCatalog
      key={`${clerkUserId}:${user.id}`}
      userId={user.id}
      clerkUserId={clerkUserId}
    >
      {children}
    </MemberCatalog>
  );
}

function MemberCatalog({
  children,
  userId,
  clerkUserId,
}: {
  children: ReactNode;
  userId: string;
  clerkUserId: string;
}) {
  const utils = api.useUtils();
  const [dashboard, setDashboard] = useState<Dashboard>();
  useEffect(() => {
    let cancelled = false;
    const current = createDashboard(userId);
    void current.restored.then(() => {
      if (cancelled) return;
      setDashboard(current);
    });
    void utils.dashboardDb.userProfile.get.prefetch();
    void utils.stripe.getSubscription
      .fetch()
      .then((subscription) => {
        if (!cancelled) writeCachedSubscription(clerkUserId, subscription);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, clerkUserId, utils]);
  return dashboard ? (
    <Catalog dashboard={dashboard}>{children}</Catalog>
  ) : (
    <DashboardDbLoadingScreen status="loading" isExiting={false} />
  );
}

function Catalog({
  dashboard,
  children,
}: {
  dashboard: Dashboard;
  children: ReactNode;
}) {
  const listings = useLiveQuery({
    query: (q) => q.from({ row: dashboard.listings }),
  });
  const lists = useLiveQuery({
    query: (q) => q.from({ row: dashboard.lists }),
  });
  const images = useLiveQuery({
    query: (q) => q.from({ row: dashboard.images }),
  });
  const references = useLiveQuery({
    query: (q) => q.from({ row: dashboard.references }),
  });
  const query = useQuery(
    { ...dashboard.queryOptions, refetchOnMount: "always" },
    dashboard.queryClient,
  );
  const [startedAt] = useState(() => new Date());
  const localReady = [listings, lists, images, references].every(
    (result) => result.isReady,
  );
  const hasSavedCatalog = query.data !== undefined;
  const ready = localReady && hasSavedCatalog;
  const status: DashboardDbStatus = ready
    ? "ready"
    : query.isError
      ? "error"
      : "loading";
  useEffect(() => {
    if (!query.error) return;
    if (hasSavedCatalog)
      toast.error(
        "Could not refresh your catalog. Your saved catalog is still available.",
        { id: "dashboard-refresh-error" },
      );
    reportDashboardLoadFailure({
      error: query.error,
      userId: dashboard.userId,
      phase: "tanstack-catalog",
      startedAt,
      failedAt: new Date(),
      elapsedMs: Date.now() - startedAt.getTime(),
      bootstrapActive: true,
    });
  }, [query.error, hasSavedCatalog, dashboard.userId, startedAt]);
  return (
    <Context.Provider
      value={{
        status,
        userId: dashboard.userId,
        isRefreshing: query.isFetching,
      }}
    >
      {ready ? (
        <Suspense
          fallback={
            <DashboardDbLoadingScreen status="loading" isExiting={false} />
          }
        >
          {children}
        </Suspense>
      ) : (
        <DashboardDbLoadingScreen status={status} isExiting={false} />
      )}
    </Context.Provider>
  );
}
