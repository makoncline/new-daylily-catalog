"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { cleanupImagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { cleanupListingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { cleanupListsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { cleanupCultivarReferencesCollection } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { setCurrentUserId } from "@/lib/utils/cursor";
import {
  bootstrapDashboardDbFromReplica,
  bootstrapDashboardDbFromServer,
  hasFreshDashboardDbSqliteCache,
  hydrateDashboardDbFromSqlitePersistence,
  revalidateDashboardDbInBackground,
  resetDashboardRefreshLock,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { configureDashboardDbCollectionsPersistence } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-collections";
import { getDashboardDbSqlitePersistence } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-sqlite-persistence";
import {
  DashboardDbLoadingScreen,
  type DashboardDbStatus,
} from "@/app/dashboard/_components/dashboard-db-loading-screen";
import { reportDashboardLoadFailure } from "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting";
import { logDashboardSyncTiming } from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import { writeCachedSubscription } from "@/hooks/use-persisted-subscription-query";

interface DashboardDbState {
  status: DashboardDbStatus;
  userId: string | null;
  isRefreshing: boolean;
}

const DashboardDbContext = createContext<DashboardDbState | null>(null);

export function useDashboardDb() {
  const value = useContext(DashboardDbContext);
  if (!value) {
    throw new Error("useDashboardDb must be used within DashboardDbProvider");
  }
  return value;
}

export function DashboardDbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const utils = api.useUtils();
  const {
    data: user,
    isLoading,
    isError,
  } = api.dashboardDb.user.getCurrentUserId.useQuery();

  const userId = user?.id ?? null;

  const [state, setState] = useState<DashboardDbState>({
    status: "idle",
    userId: null,
    isRefreshing: false,
  });

  const [hideLoadingScreen, setHideLoadingScreen] = useState(false);
  const [isExitingLoadingScreen, setIsExitingLoadingScreen] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const lastReportedFailureKeyRef = useRef<string | null>(null);
  const sqlitePersistencePromiseRef = useRef<ReturnType<
    typeof getDashboardDbSqlitePersistence
  > | null>(null);
  const sqlitePersistenceStartedAtRef = useRef<number | null>(null);
  const setDashboardDbState = (nextState: DashboardDbState) => {
    queueMicrotask(() => {
      setState((current) =>
        current.status === nextState.status &&
        current.userId === nextState.userId &&
        current.isRefreshing === nextState.isRefreshing
          ? current
          : nextState,
      );
    });
  };

  const setLoadingScreenState = ({
    hide,
    exiting,
  }: {
    hide: boolean;
    exiting: boolean;
  }) => {
    queueMicrotask(() => {
      setHideLoadingScreen((current) => (current === hide ? current : hide));
      setIsExitingLoadingScreen((current) =>
        current === exiting ? current : exiting,
      );
    });
  };
  const setDashboardRefreshing = (
    nextIsRefreshing: boolean,
    expectedUserId: string,
  ) => {
    queueMicrotask(() => {
      setState((current) =>
        current.userId === expectedUserId
          ? { ...current, isRefreshing: nextIsRefreshing }
          : current,
      );
    });
  };

  useEffect(() => {
    sqlitePersistenceStartedAtRef.current = performance.now();
    sqlitePersistencePromiseRef.current = getDashboardDbSqlitePersistence();
  }, []);

  useEffect(() => {
    if (state.status !== "ready") {
      setLoadingScreenState({ hide: false, exiting: false });
      return;
    }

    setLoadingScreenState({ hide: false, exiting: true });
    const id = window.setTimeout(() => {
      setHideLoadingScreen(true);
    }, 200);

    return () => {
      window.clearTimeout(id);
    };
  }, [state.status]);

  useEffect(() => {
    if (isLoading) {
      setDashboardDbState({
        status: "loading",
        userId: null,
        isRefreshing: false,
      });
      return;
    }

    if (!userId) {
      initializedUserIdRef.current = null;
      resetDashboardRefreshLock();
      setCurrentUserId(null);
      getQueryClient().removeQueries({ queryKey: ["dashboard-db"] });
      void Promise.allSettled([
        cleanupListingsCollection(),
        cleanupListsCollection(),
        cleanupImagesCollection(),
        cleanupCultivarReferencesCollection(),
      ]).finally(() => {
        configureDashboardDbCollectionsPersistence({
          persistence: null,
          userId: null,
        });
      });
      setDashboardDbState({
        status: "idle",
        userId: null,
        isRefreshing: false,
      });
      return;
    }

    if (isError) {
      return;
    }

    if (initializedUserIdRef.current === userId) {
      return;
    }

    const bootstrapUserId = userId;
    let finished = false;
    initializedUserIdRef.current = bootstrapUserId;
    let cancelled = false;
    let phase = "sqlite-persistence";
    const startedAt = new Date();
    const startedAtMs = performance.now();
    const isBootstrapActive = () =>
      !cancelled && initializedUserIdRef.current === bootstrapUserId;
    const refreshSubscriptionCache = async () => {
      await utils.stripe.getSubscription.invalidate();
      const subscription = await utils.stripe.getSubscription.fetch();
      if (isBootstrapActive()) {
        writeCachedSubscription(userId, subscription);
      }
    };
    const startBackgroundRefresh = () => {
      const refreshStartedAt = performance.now();
      void revalidateDashboardDbInBackground(userId, {
        isActive: isBootstrapActive,
      }).finally(() => {
        if (!isBootstrapActive()) return;

        void refreshSubscriptionCache();
        logDashboardSyncTiming(
          "provider.background-refresh",
          refreshStartedAt,
          {
            path: phase,
          },
        );
        setDashboardRefreshing(false, userId);
      });
    };
    setCurrentUserId(userId);
    setDashboardDbState({
      status: "loading",
      userId,
      isRefreshing: false,
    });

    void (async () => {
      try {
        const profilePrefetchPromise =
          utils.dashboardDb.userProfile.get.prefetch();
        const sqlitePersistenceAwaitStartedAt = performance.now();
        if (!sqlitePersistencePromiseRef.current) {
          sqlitePersistenceStartedAtRef.current =
            sqlitePersistenceAwaitStartedAt;
          sqlitePersistencePromiseRef.current =
            getDashboardDbSqlitePersistence();
        }
        const sqlitePersistence = await sqlitePersistencePromiseRef.current;
        const sqlitePersistenceReadyAt = performance.now();
        const sqlitePersistenceDurationMs =
          sqlitePersistenceReadyAt -
          (sqlitePersistenceStartedAtRef.current ??
            sqlitePersistenceAwaitStartedAt);
        const sqlitePersistenceAwaitDurationMs =
          sqlitePersistenceReadyAt - sqlitePersistenceAwaitStartedAt;
        configureDashboardDbCollectionsPersistence({
          persistence: sqlitePersistence,
          userId,
        });

        const hasFreshSqliteCache =
          sqlitePersistence && hasFreshDashboardDbSqliteCache(userId);

        if (hasFreshSqliteCache) {
          phase = "sqlite-warm-hydrate";
          setDashboardDbState({
            status: "loading",
            userId,
            isRefreshing: true,
          });
          const warmHydrateStartedAt = performance.now();
          const [hydrateResult, profilePrefetchResult] =
            await Promise.allSettled([
              hydrateDashboardDbFromSqlitePersistence({
                userId,
              }),
              profilePrefetchPromise,
            ]);

          if (hydrateResult.status === "fulfilled") {
            if (profilePrefetchResult.status === "rejected") {
              throw profilePrefetchResult.reason;
            }

            if (!cancelled) {
              finished = true;
              setState({
                status: "ready",
                userId,
                isRefreshing: true,
              });
              logDashboardSyncTiming("provider.ready", startedAtMs, {
                path: phase,
                sqlitePersistenceDurationMs: Number(
                  sqlitePersistenceDurationMs.toFixed(1),
                ),
                sqlitePersistenceAwaitDurationMs: Number(
                  sqlitePersistenceAwaitDurationMs.toFixed(1),
                ),
                warmHydrateDurationMs: Number(
                  (performance.now() - warmHydrateStartedAt).toFixed(1),
                ),
              });
              startBackgroundRefresh();
            }
            return;
          }
        }

        phase = "replica-bootstrap";
        const replicaBootstrapStartedAt = performance.now();
        const [usedReplica] = await Promise.all([
          bootstrapDashboardDbFromReplica(userId, {
            isActive: isBootstrapActive,
          }),
          profilePrefetchPromise,
        ]);
        const replicaBootstrapDurationMs =
          performance.now() - replicaBootstrapStartedAt;

        let serverBootstrapDurationMs: number | null = null;
        if (!usedReplica) {
          phase = "cold-bootstrap";
          const serverBootstrapStartedAt = performance.now();
          await bootstrapDashboardDbFromServer(userId, {
            isActive: isBootstrapActive,
          });
          serverBootstrapDurationMs =
            performance.now() - serverBootstrapStartedAt;
        }

        if (!cancelled) {
          finished = true;
          setState({
            status: "ready",
            userId,
            isRefreshing: usedReplica,
          });
          logDashboardSyncTiming("provider.ready", startedAtMs, {
            path: phase,
            sqlitePersistenceDurationMs: Number(
              sqlitePersistenceDurationMs.toFixed(1),
            ),
            sqlitePersistenceAwaitDurationMs: Number(
              sqlitePersistenceAwaitDurationMs.toFixed(1),
            ),
            hasFreshSqliteCache: false,
            usedReplica,
            replicaBootstrapDurationMs: Number(
              replicaBootstrapDurationMs.toFixed(1),
            ),
            serverBootstrapDurationMs:
              serverBootstrapDurationMs === null
                ? null
                : Number(serverBootstrapDurationMs.toFixed(1)),
          });

          if (usedReplica) {
            startBackgroundRefresh();
          }
        }
      } catch (error) {
        if (!cancelled) {
          const failedAt = new Date();
          const failureKey = `${bootstrapUserId}:${phase}:${String(error)}`;
          if (lastReportedFailureKeyRef.current !== failureKey) {
            lastReportedFailureKeyRef.current = failureKey;
            reportDashboardLoadFailure({
              error,
              userId,
              phase,
              startedAt,
              failedAt,
              elapsedMs: failedAt.getTime() - startedAt.getTime(),
              bootstrapActive: isBootstrapActive(),
            });
          }

          setState({
            status: "error",
            userId,
            isRefreshing: false,
          });
        }
        if (initializedUserIdRef.current === bootstrapUserId) {
          initializedUserIdRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (!finished && initializedUserIdRef.current === bootstrapUserId) {
        initializedUserIdRef.current = null;
      }
    };
  }, [isError, isLoading, userId, utils]);

  return (
    <DashboardDbContext.Provider value={state}>
      {state.status === "ready" ? children : null}

      {hideLoadingScreen ? null : (
        <DashboardDbLoadingScreen
          status={state.status}
          isExiting={isExitingLoadingScreen}
        />
      )}
    </DashboardDbContext.Provider>
  );
}
