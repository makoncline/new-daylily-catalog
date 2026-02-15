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
import {
  persistDashboardDbToPersistence,
  revalidateDashboardDbInBackground,
  tryHydrateDashboardDbFromPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";

type DashboardDbStatus = "idle" | "loading" | "ready" | "error";

interface DashboardDbState {
  status: DashboardDbStatus;
  userId: string | null;
}

const DashboardDbContext = createContext<DashboardDbState | null>(null);

function DashboardDbLoadingScreen({ status }: { status: DashboardDbStatus }) {
  const funPhrases = useMemo(
    () => [
      "Pruning the daylilies...",
      "Deadheading blooms...",
      "Watering the beds...",
      "Spreading fresh mulch...",
      "Checking the soil...",
      "Dividing the clumps...",
      "Collecting seeds...",
      "Clearing out weeds...",
      "Setting row markers...",
      "Welcoming pollinators...",
      "Look, a bird...",
      "Chasing off the raccoon...",
      "Frog photoshoot...",
      "Snail patrol...",
      "Squirrel negotiations...",
      "Checking for new buds...",
      "Bee count...",
      "Admiring the blooms...",
      "Watering break...",
      '"Just one more plant"...',
      "Tag hunt...",
      "Scape count...",
      "Bud watch...",
      "Mulch monster: appeased...",
      "Cultivar ID: maybe...",
      "Late bloomer pep talk...",
      "Bloom timer: imminent...",
      "Deer deterrent duty...",
      "Hail check...",
      "Fence gap investigation...",
    ],
    [],
  );

  const [phraseIndex, setPhraseIndex] = useState(() => {
    const seed = Math.floor(Date.now() / 1000);
    return seed % funPhrases.length;
  });

  useEffect(() => {
    if (status === "error") return;

    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % funPhrases.length);
    }, 2000);

    return () => {
      window.clearInterval(id);
    };
  }, [funPhrases.length, status]);

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md space-y-6 px-8 py-10">
        <div className="space-y-1">
          <div className="text-lg font-semibold">
            {status === "error"
              ? "Unable to load dashboard data"
              : "fetching your catalog"}
          </div>
          <div className="text-muted-foreground text-sm">
            {status === "error"
              ? "Please refresh the page."
              : funPhrases[phraseIndex]}
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
  } = api.dashboardDb.user.getCurrentUser.useQuery(undefined, {
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
        const hydrated = await tryHydrateDashboardDbFromPersistence(userId);

        if (hydrated) {
          void revalidateDashboardDbInBackground(userId);
          void utils.dashboardDb.dashboard.getStats.prefetch();
          void utils.dashboardDb.userProfile.get.prefetch();
        } else {
          await Promise.all([
            initializeListingsCollection(userId),
            initializeListsCollection(userId),
            initializeImagesCollection(userId),
            initializeCultivarReferencesCollection(userId),
            utils.dashboardDb.dashboard.getStats.prefetch(),
            utils.dashboardDb.userProfile.get.prefetch(),
          ]);
          void persistDashboardDbToPersistence(userId);
        }

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
  }, [isError, isLoading, userId, utils]);

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
