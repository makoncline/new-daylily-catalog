"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { CreateListingButton } from "./create-listing-button";
import { useEditListing } from "./edit-listing-dialog";
import { useDataTable } from "@/hooks/use-data-table";
import {
  DataTableDownload,
  DataTableViewOptions,
} from "@/components/data-table";
import { APP_CONFIG } from "@/config/constants";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { getColumns } from "./columns";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";
import { api } from "@/trpc/react";

function ListingsTableLive() {
  const firstRowsPaintedRef = React.useRef(false);
  const { editListing } = useEditListing();
  const { listingRows: listings, lists } = useDashboardListingReadModel();
  const { data: profile = null } = api.dashboardDb.userProfile.get.useQuery(
    undefined,
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );
  const publicUserSlug = profile?.slug ?? profile?.userId ?? "";

  const columns = React.useMemo(
    () => getColumns(editListing, publicUserSlug),
    [editListing, publicUserSlug],
  );
  const [searchMode, setSearchMode] = useLocalStorage<PublicCatalogSearchMode>(
    "dashboard-listings-search-mode",
    "basic",
  );
  const [searchCollapsed, setSearchCollapsed] = useLocalStorage(
    "dashboard-listings-search-collapsed",
    false,
  );
  const columnNames = React.useMemo(
    () => ({
      ...LISTING_TABLE_COLUMN_NAMES,
      ...buildPublicCatalogSearchColumnNames(),
      hasPhoto: "Has Photo",
      linkedToCultivar: "Linked to Cultivar",
      priceValue: "Price Range",
    }),
    [],
  );

  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "listings-table",
    columnNames,
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
    },
    config: {
      enableRowSelection: true,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
      columnVisibility: {
        cultivarName: false,
        hasPhoto: false,
        linkedToCultivar: false,
        parentage: false,
        priceValue: false,
      },
    },
  });

  const listOptions = React.useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );

  const facetOptions = React.useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  React.useEffect(() => {
    logDashboardTiming("listings-table.mounted");
  }, []);

  React.useEffect(() => {
    if (firstRowsPaintedRef.current || listings.length === 0) return;

    firstRowsPaintedRef.current = true;
    logDashboardTiming("listings-table.first-rows-painted", {
      listings: listings.length,
      lists: lists.length,
      tableRows: table.getRowModel().rows.length,
      filteredRows: table.getFilteredRowModel().rows.length,
    });
  }, [listings.length, lists.length, table]);

  const scrollToResultsSummary = () => {
    document
      .getElementById("dashboard-listings-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.key === "/"
      ) {
        event.preventDefault();
        setSearchCollapsed((collapsed) => !collapsed);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchCollapsed]);

  if (!listings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="listing-table">
      <PublicCatalogSearchAdvancedPanel
        advancedSectionsColumns={3}
        table={table}
        listOptions={listOptions}
        facetOptions={facetOptions}
        mode={searchMode}
        onModeChange={setSearchMode}
        collapsed={searchCollapsed}
        onCollapsedChange={setSearchCollapsed}
        onSearchSubmit={scrollToResultsSummary}
      />

      <div id="dashboard-listings-results" className="min-w-0">
        <DataTableLayout
          table={table}
          toolbar={
            <div className="flex items-center justify-end">
              <DataTableViewOptions table={table} />
            </div>
          }
          pagination={
            <>
              <DataTablePagination
                table={table}
                pageSizeOptions={
                  APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
                }
              />
              <DataTableDownload table={table} filenamePrefix="listings" />
            </>
          }
          noResults={
            <EmptyState
              title="No listings found"
              description="Try adjusting your filters or create a new listing"
              action={<CreateListingButton />}
            />
          }
        >
          <DataTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}

export function ListingsTable() {
  return <ListingsTableLive />;
}
