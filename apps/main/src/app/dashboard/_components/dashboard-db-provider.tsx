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
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { toast } from "sonner";
import { createDashboard } from "@/app/dashboard/_lib/dashboard-db/collections";
import {
  DashboardDbLoadingScreen,
  type DashboardDbStatus,
} from "@/app/dashboard/_components/dashboard-db-loading-screen";
import { reportDashboardLoadFailure } from "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting";
import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

type State = Dashboard & {
  status: DashboardDbStatus;
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
    queryFn: ({ signal }) => {
      if (!clerkUserId) throw new Error("Not signed in");
      return getTrpcClient().dashboardV2.user.getCurrentUserId.query(
        { clerkUserId },
        {
          signal,
        },
      );
    },
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
  const [dashboard, setDashboard] = useState<Dashboard>();
  useEffect(() => {
    let cancelled = false;
    const current = createDashboard(userId);
    void current.restored.then(() => {
      if (cancelled) return;
      setDashboard(current);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return dashboard ? (
    <QueryClientProvider client={dashboard.queryClient}>
      <api.Provider
        client={dashboard.client}
        queryClient={dashboard.queryClient}
      >
        <Catalog dashboard={dashboard} clerkUserId={clerkUserId}>
          {children}
        </Catalog>
      </api.Provider>
    </QueryClientProvider>
  ) : (
    <DashboardDbLoadingScreen status="loading" isExiting={false} />
  );
}

function Catalog({
  dashboard,
  children,
  clerkUserId,
}: {
  dashboard: Dashboard;
  children: ReactNode;
  clerkUserId: string;
}) {
  const utils = api.useUtils();
  useEffect(() => {
    let cancelled = false;
    void utils.dashboardV2.userProfile.get.prefetch();
    void utils.stripe.getSubscription
      .fetch()
      .then((subscription) => {
        if (!cancelled) writeCachedSubscription(clerkUserId, subscription);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clerkUserId, utils]);
  const listings = useLiveQuery({
    query: (q) => q.from({ row: dashboard.listingsCollection }),
  });
  const lists = useLiveQuery({
    query: (q) => q.from({ row: dashboard.listsCollection }),
  });
  const images = useLiveQuery({
    query: (q) => q.from({ row: dashboard.imagesCollection }),
  });
  const references = useLiveQuery({
    query: (q) => q.from({ row: dashboard.cultivarReferencesCollection }),
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
      phase: "catalog",
      startedAt,
      failedAt: new Date(),
      elapsedMs: Date.now() - startedAt.getTime(),
      bootstrapActive: true,
    });
  }, [query.error, hasSavedCatalog, dashboard.userId, startedAt]);
  return (
    <Context.Provider
      value={{
        ...dashboard,
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
