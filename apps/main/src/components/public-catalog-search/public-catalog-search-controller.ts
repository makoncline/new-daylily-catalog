"use client";

import { type ColumnDef, type Table, useReactTable } from "@tanstack/react-table";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { defaultTableConfig } from "@/lib/table-config";
import { withPublicClientQueryCache } from "@/lib/cache/client-cache";
import { api } from "@/trpc/react";
import { useDataTable } from "@/hooks/use-data-table";
import {
  createPublicCatalogSearchSnapshotFromInfiniteData,
  isPublicCatalogSearchSnapshotUsable,
  prefetchAndPersistPublicCatalogSearchSnapshot,
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR,
  readPublicCatalogSearchSnapshot,
  snapshotToInfiniteData,
  shouldRevalidatePublicCatalogSearchSnapshot,
  writePublicCatalogSearchSnapshot,
} from "@/lib/public-catalog-search-persistence";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
} from "./public-catalog-search-registry";
import { publicCatalogSearchColumns } from "./public-catalog-search-columns";
import {
  type PublicCatalogListing,
  type PublicCatalogLists,
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
  type PublicCatalogSearchMode,
} from "./public-catalog-search-types";

type PublicCatalogSearchListingsData = {
  pages: PublicCatalogListing[][];
  pageParams: Array<string | undefined>;
};

export interface PublicCatalogSearchControllerState {
  listings: PublicCatalogListing[];
  refreshCatalogData: () => Promise<void>;
  isRefreshingCatalogData: boolean;
  isFetchingNextPage: boolean;
  listOptions: PublicCatalogSearchFacetOption[];
  facetOptions: PublicCatalogSearchFacetOptions;
  mode: PublicCatalogSearchMode;
  setMode: (mode: PublicCatalogSearchMode) => void;
  panelCollapsed: boolean;
  setPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  scrollToResultsSummary: () => void;
  table: Table<PublicCatalogListing>;
}

interface UsePublicCatalogSearchControllerArgs {
  initialListings: PublicCatalogListing[];
  lists: PublicCatalogLists;
  userId: string;
  userSlugOrId: string;
}

function useOptionalRouter() {
  try {
    return useRouter();
  } catch {
    return {
      replace: () => undefined,
    };
  }
}

function useOptionalPathname() {
  try {
    return usePathname();
  } catch {
    return "";
  }
}

function useOptionalSearchParams() {
  try {
    return useSearchParams();
  } catch {
    return new URLSearchParams();
  }
}

function usePublicCatalogSearchControllerTest({
  initialListings,
  lists,
  userId,
  userSlugOrId,
}: UsePublicCatalogSearchControllerArgs): PublicCatalogSearchControllerState {
  const utils = api.useUtils();
  const [isRefreshingCatalogData, setIsRefreshingCatalogData] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const queryInput = useMemo(
    () => ({
      userSlugOrId,
      limit: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit,
    }),
    [userSlugOrId],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(
      queryInput,
      withPublicClientQueryCache({
        getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
        initialData: {
          pages: [initialListings],
          pageParams: [undefined],
        },
        retry: false,
      }),
    );

  usePublicCatalogSearchSnapshotEffects({
    data,
    fetchNextPage,
    queryInput,
    userId,
    userSlugOrId,
    utils,
    hasNextPage,
    isFetchingNextPage,
  });

  const listings = getClientListings({
    data,
    initialListings,
  });

  const listOptions = useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );

  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  const table = useReactTable({
    ...defaultTableConfig<PublicCatalogListing>(),
    data: listings,
    columns: publicCatalogSearchColumns as ColumnDef<
      PublicCatalogListing,
      unknown
    >[],
    autoResetPageIndex: false,
    initialState: {
      sorting: [],
      pagination: {
        pageIndex: 0,
        pageSize: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit,
      },
    },
    meta: {
      filterableColumns: [],
      storageKey: "public-catalog-listings-table",
      pinnedColumns: { left: [], right: [] },
      getColumnLabel: (columnId) => columnId,
    },
  });

  const mode = "basic" satisfies PublicCatalogSearchMode;

  const setMode = () => undefined;

  const scrollToResultsSummary = () => {
    const target = document.getElementById("public-search-results-summary");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refreshCatalogData = async () => {
    if (isRefreshingCatalogData) {
      return;
    }

    setIsRefreshingCatalogData(true);

    try {
      const refreshedSnapshot =
        await prefetchAndPersistPublicCatalogSearchSnapshot({
          userId,
          userSlugOrId,
          force: true,
        });

      if (refreshedSnapshot) {
        utils.public.getListings.setInfiniteData(queryInput, () =>
          snapshotToInfiniteData(refreshedSnapshot),
        );
        toast.success("Catalog search data refreshed");
        return;
      }

      toast.error("Unable to refresh catalog search data");
    } catch {
      toast.error("Unable to refresh catalog search data");
    } finally {
      setIsRefreshingCatalogData(false);
    }
  };

  return {
    facetOptions,
    isFetchingNextPage,
    isRefreshingCatalogData,
    listOptions,
    listings,
    mode,
    panelCollapsed,
    refreshCatalogData,
    scrollToResultsSummary,
    setMode,
    setPanelCollapsed,
    table,
  };
}

function usePublicCatalogSearchSnapshotEffects({
  data,
  fetchNextPage,
  queryInput,
  userId,
  userSlugOrId,
  utils,
  hasNextPage,
  isFetchingNextPage,
}: {
  data: PublicCatalogSearchListingsData | undefined;
  fetchNextPage: () => Promise<unknown>;
  queryInput: {
    userSlugOrId: string;
    limit: number;
  };
  userId: string;
  userSlugOrId: string;
  utils: ReturnType<typeof api.useUtils>;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}) {
  const [isSnapshotCheckDone, setIsSnapshotCheckDone] = useState(
    !PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled,
  );

  useEffect(() => {
    if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const snapshot = await readPublicCatalogSearchSnapshot(userId);
      if (snapshot && isPublicCatalogSearchSnapshotUsable(snapshot)) {
        utils.public.getListings.setInfiniteData(queryInput, () =>
          snapshotToInfiniteData(snapshot),
        );

        if (shouldRevalidatePublicCatalogSearchSnapshot(snapshot)) {
          void prefetchAndPersistPublicCatalogSearchSnapshot({
            userId,
            userSlugOrId,
            force: true,
          }).then((revalidatedSnapshot) => {
            if (cancelled || !revalidatedSnapshot) {
              return;
            }

            utils.public.getListings.setInfiniteData(queryInput, () =>
              snapshotToInfiniteData(revalidatedSnapshot),
            );
  });
}
      }

      if (!cancelled) {
        setIsSnapshotCheckDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryInput, userId, userSlugOrId, utils]);

  useEffect(() => {
    if (!isSnapshotCheckDone) {
      return;
    }

    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isSnapshotCheckDone]);

  useEffect(() => {
    if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
      return;
    }

    if (!data?.pages?.length || hasNextPage || isFetchingNextPage) {
      return;
    }

    const snapshot = createPublicCatalogSearchSnapshotFromInfiniteData({
      userId,
      userSlugOrId,
      data,
    });

    void writePublicCatalogSearchSnapshot(snapshot);
  }, [data, hasNextPage, isFetchingNextPage, userId, userSlugOrId]);
}

function getClientListings({
  data,
  initialListings,
}: {
  data: PublicCatalogSearchListingsData | undefined;
  initialListings: PublicCatalogListing[];
}) {
  const dataPages = data?.pages;

  if (!dataPages) {
    return initialListings;
  }

  const allListings = dataPages.flat();
  const uniqueListings = new Map<string, (typeof allListings)[number]>();

  allListings.forEach((listing) => {
    uniqueListings.set(listing.id, listing);
  });

  return sortTitlesLettersBeforeNumbers(Array.from(uniqueListings.values()));
}

export function usePublicCatalogSearchController({
  initialListings,
  lists,
  userId,
  userSlugOrId,
}: UsePublicCatalogSearchControllerArgs): PublicCatalogSearchControllerState {
  const controller = (
    process.env.NODE_ENV === "test"
      ? usePublicCatalogSearchControllerTest
      : usePublicCatalogSearchControllerProd
  ) as typeof usePublicCatalogSearchControllerProd;

  return controller({
    initialListings,
    lists,
    userId,
    userSlugOrId,
  });
}

function usePublicCatalogSearchControllerProd({
  initialListings,
  lists,
  userId,
  userSlugOrId,
}: UsePublicCatalogSearchControllerArgs): PublicCatalogSearchControllerState {
  const utils = api.useUtils();
  const pathname = useOptionalPathname();
  const router = useOptionalRouter();
  const searchParams = useOptionalSearchParams();
  const [isRefreshingCatalogData, setIsRefreshingCatalogData] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const queryInput = useMemo(
    () => ({
      userSlugOrId,
      limit: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit,
    }),
    [userSlugOrId],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(
      queryInput,
      withPublicClientQueryCache({
        getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
        initialData: {
          pages: [initialListings],
          pageParams: [undefined],
        },
        retry: false,
      }),
    );

  usePublicCatalogSearchSnapshotEffects({
    data,
    fetchNextPage,
    queryInput,
    userId,
    userSlugOrId,
    utils,
    hasNextPage,
    isFetchingNextPage,
  });

  const listings = getClientListings({
    data,
    initialListings,
  });

  const listOptions = useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );

  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  const columnNames = useMemo(
    () => buildPublicCatalogSearchColumnNames(),
    [],
  );

  const table = useDataTable({
    data: listings,
    columns: publicCatalogSearchColumns,
    storageKey: "public-catalog-listings-table",
    columnNames,
  });

  const mode = (searchParams.get("mode") === "advanced"
    ? "advanced"
    : "basic") satisfies PublicCatalogSearchMode;

  const setMode = (nextMode: PublicCatalogSearchMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextMode === "advanced") {
      params.set("mode", "advanced");
    } else {
      params.delete("mode");
    }

    const query = params.toString();
    void router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const scrollToResultsSummary = () => {
    const target = document.getElementById("public-search-results-summary");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refreshCatalogData = async () => {
    if (isRefreshingCatalogData) {
      return;
    }

    setIsRefreshingCatalogData(true);

    try {
      const refreshedSnapshot =
        await prefetchAndPersistPublicCatalogSearchSnapshot({
          userId,
          userSlugOrId,
          force: true,
        });

      if (refreshedSnapshot) {
        utils.public.getListings.setInfiniteData(queryInput, () =>
          snapshotToInfiniteData(refreshedSnapshot),
        );
        toast.success("Catalog search data refreshed");
        return;
      }

      toast.error("Unable to refresh catalog search data");
    } catch {
      toast.error("Unable to refresh catalog search data");
    } finally {
      setIsRefreshingCatalogData(false);
    }
  };

  return {
    facetOptions,
    isFetchingNextPage,
    isRefreshingCatalogData,
    listOptions,
    listings,
    mode,
    panelCollapsed,
    refreshCatalogData,
    scrollToResultsSummary,
    setMode,
    setPanelCollapsed,
    table,
  };
}
