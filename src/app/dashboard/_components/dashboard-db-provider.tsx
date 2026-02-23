"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import {
  imagesCollection,
  initializeImagesCollection,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  initializeListingsCollection,
  listingsCollection,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  initializeListsCollection,
  listsCollection,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import {
  cultivarReferencesCollection,
  initializeCultivarReferencesCollection,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { setCurrentUserId } from "@/lib/utils/cursor";
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
  const setDashboardDbState = (nextState: DashboardDbState) => {
    queueMicrotask(() => {
      setState((current) =>
        current.status === nextState.status && current.userId === nextState.userId
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
      setDashboardDbState({ status: "loading", userId: null });
      return;
    }

    if (isError || !userId) {
      setCurrentUserId(null);
      getQueryClient().removeQueries({ queryKey: ["dashboard-db"] });
      void Promise.allSettled([
        listingsCollection.cleanup(),
        listsCollection.cleanup(),
        imagesCollection.cleanup(),
        cultivarReferencesCollection.cleanup(),
      ]);
      setDashboardDbState({ status: isError ? "error" : "idle", userId: null });
      return;
    }

    let cancelled = false;
    setDashboardDbState({ status: "loading", userId });

    void (async () => {
      try {
        await Promise.all([
          initializeListingsCollection(userId),
          initializeListsCollection(userId),
          initializeImagesCollection(userId),
          initializeCultivarReferencesCollection(userId),
        ]);

        if (!cancelled) {
          setState({ status: "ready", userId });
        }
      } catch {
        if (!cancelled) setState({ status: "error", userId });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isError, isLoading, userId]);

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
