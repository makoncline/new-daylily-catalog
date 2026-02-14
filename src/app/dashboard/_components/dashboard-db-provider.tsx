"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/trpc/react";
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

type DashboardDbStatus = "idle" | "loading" | "ready" | "error";

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
      {children}
    </DashboardDbContext.Provider>
  );
}
