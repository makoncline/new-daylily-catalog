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
import {
  cleanupImagesCollection,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  cleanupListingsCollection,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  cleanupListsCollection,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import {
  cleanupCultivarReferencesCollection,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { setCurrentUserId } from "@/lib/utils/cursor";
import {
  bootstrapDashboardDbFromServer,
  revalidateDashboardDbInBackground,
  tryHydrateDashboardDbFromPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  DashboardDbLoadingScreen,
  type DashboardDbStatus,
} from "@/app/dashboard/_components/dashboard-db-loading-screen";

interface DashboardDbState {
  status: DashboardDbStatus;
  userId: string | null;
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
  } = api.dashboardDb.user.getCurrentUser.useQuery();

  const userId = user?.id ?? null;

  const [state, setState] = useState<DashboardDbState>({
    status: "idle",
    userId: null,
  });

  const [hideLoadingScreen, setHideLoadingScreen] = useState(false);
  const [isExitingLoadingScreen, setIsExitingLoadingScreen] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const setDashboardDbState = (nextState: DashboardDbState) => {
    queueMicrotask(() => {
      setState((current) =>
        current.status === nextState.status &&
        current.userId === nextState.userId
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
      });
      return;
    }

    if (!userId) {
      initializedUserIdRef.current = null;
      setCurrentUserId(null);
      getQueryClient().removeQueries({ queryKey: ["dashboard-db"] });
      void Promise.allSettled([
        cleanupListingsCollection(),
        cleanupListsCollection(),
        cleanupImagesCollection(),
        cleanupCultivarReferencesCollection(),
      ]);
      setDashboardDbState({
        status: "idle",
        userId: null,
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
    setDashboardDbState({
      status: "loading",
      userId,
    });

    void (async () => {
      try {
        const hydrated = await tryHydrateDashboardDbFromPersistence(userId);

        if (hydrated) {
          void revalidateDashboardDbInBackground(userId);
          void utils.dashboardDb.userProfile.get.prefetch();
          if (!cancelled) {
            finished = true;
            setState({
              status: "ready",
              userId,
            });
          }
          return;
        }

        await Promise.all([
          bootstrapDashboardDbFromServer(userId),
          utils.dashboardDb.userProfile.get.prefetch(),
        ]);

        if (!cancelled) {
          finished = true;
          setState({
            status: "ready",
            userId,
          });
        }
      } catch {
        if (initializedUserIdRef.current === bootstrapUserId) {
          initializedUserIdRef.current = null;
        }
        if (!cancelled) {
          setState({
            status: "error",
            userId,
          });
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
