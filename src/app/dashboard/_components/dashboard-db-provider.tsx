"use client";
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

function DaylilySpinner() {
  return (
    <div className="relative h-12 w-12" aria-hidden>
      <div
        className="border-foreground/10 border-t-foreground/35 absolute inset-0 rounded-full border"
        style={{ animation: "spin 1.2s linear infinite" }}
      />
      <svg
        viewBox="0 0 24 24"
        className="text-primary absolute inset-0 m-auto h-12 w-12"
        style={{ animation: "spin 2.6s linear infinite" }}
      >
        <g style={{ animation: "pulse 1.8s ease-in-out infinite" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <path
              key={i}
              d="M12 2.7c2.9 3.7 3.2 7.3 0 9.8c-3.2-2.5-2.9-6.1 0-9.8Z"
              transform={`rotate(${i * 60} 12 12)`}
              fill="currentColor"
              opacity={0.18}
            />
          ))}
          <circle cx="12" cy="12" r="1.9" fill="currentColor" opacity={0.75} />
        </g>
      </svg>
    </div>
  );
}

function DashboardDbLoadingScreen({
  status,
  isExiting,
}: {
  status: DashboardDbStatus;
  isExiting: boolean;
}) {
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

  const [isFadingPhrase, setIsFadingPhrase] = useState(false);

  useEffect(() => {
    if (status === "error") return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [status]);

  useEffect(() => {
    if (status === "error") return;

    const id = window.setInterval(() => {
      setIsFadingPhrase(true);

      window.setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % funPhrases.length);
        setIsFadingPhrase(false);
      }, 250);
    }, 5000);

    return () => {
      window.clearInterval(id);
    };
  }, [funPhrases.length, status]);

  return (
    <div
      className={
        "bg-background fixed inset-0 flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 transition-opacity duration-200 ease-out" +
        (isExiting ? " opacity-0" : " opacity-100")
      }
      role="status"
      aria-live="polite"
    >
      <div className="bg-background/80 w-full max-w-sm rounded-2xl border px-8 py-10 shadow-sm backdrop-blur">
        <div className="flex flex-col items-center gap-3 text-center">
          <DaylilySpinner />

          <div className="text-base font-semibold tracking-tight">
            {status === "error"
              ? "Unable to load dashboard data"
              : "Fetching your catalog..."}
          </div>

          <div className="text-muted-foreground min-h-[2.5rem] text-sm leading-5">
            {status === "error" ? (
              "Please refresh the page."
            ) : (
              <span
                className={
                  "inline-block transition-opacity duration-300 motion-reduce:transition-none" +
                  (isFadingPhrase ? " opacity-0" : " opacity-100")
                }
              >
                {funPhrases[phraseIndex]}
              </span>
            )}
          </div>
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

  const [hideLoadingScreen, setHideLoadingScreen] = useState(false);
  const [isExitingLoadingScreen, setIsExitingLoadingScreen] = useState(false);

  useEffect(() => {
    if (state.status !== "ready") {
      setHideLoadingScreen(false);
      setIsExitingLoadingScreen(false);
      return;
    }

    setIsExitingLoadingScreen(true);
    const id = window.setTimeout(() => {
      setHideLoadingScreen(true);
    }, 200);

    return () => {
      window.clearTimeout(id);
    };
  }, [state.status]);

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
