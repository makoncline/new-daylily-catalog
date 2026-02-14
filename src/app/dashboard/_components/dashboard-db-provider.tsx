"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
import { Skeleton } from "@/components/ui/skeleton";

type DashboardDbStatus = "idle" | "loading" | "ready" | "error";

interface DashboardDbState {
  status: DashboardDbStatus;
  userId: string | null;
}

const DashboardDbContext = createContext<DashboardDbState | null>(null);

function DashboardDbLoadingScreen({ status }: { status: DashboardDbStatus }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-8 py-10">
        <div className="space-y-1">
          <div className="text-lg font-semibold">
            {status === "error"
              ? "Unable to load dashboard data"
              : "Loading your dashboard data..."}
          </div>
          <div className="text-muted-foreground text-sm">
            {status === "error"
              ? "Please refresh the page."
              : "This can take a moment for large catalogs."}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-5/6" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function useDashboardDb() {
  const value = useContext(DashboardDbContext);
  if (!value) {
    throw new Error("useDashboardDb must be used within DashboardDbProvider");
  }
  return value;
}

export function DashboardDbProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } =
    api.dashboardDb.user.getCurrentUser.useQuery(undefined, {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    });

  const userId = user?.id ?? null;

  const [state, setState] = useState<DashboardDbState>({
    status: "idle",
    userId: null,
  });

  useEffect(() => {
    if (isLoading) {
      setState({ status: "loading", userId: null });
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
      setState({ status: isError ? "error" : "idle", userId: null });
      return;
    }

    let cancelled = false;
    setState({ status: "loading", userId });

    void (async () => {
      try {
        await Promise.all([
          initializeListingsCollection(userId),
          initializeListsCollection(userId),
          initializeImagesCollection(userId),
          initializeCultivarReferencesCollection(userId),
        ]);

        if (!cancelled) setState({ status: "ready", userId });
      } catch {
        if (!cancelled) setState({ status: "error", userId });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isError,
    isLoading,
    userId,
  ]);

  const value = useMemo(() => state, [state]);

  return (
    <DashboardDbContext.Provider value={value}>
      {state.status === "ready" ? (
        children
      ) : (
        <DashboardDbLoadingScreen status={state.status} />
      )}
    </DashboardDbContext.Provider>
  );
}
