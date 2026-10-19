"use client";

import * as React from "react";
import {
  functionalUpdate,
  type RowSelectionState,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Flower2 } from "lucide-react";

import { CreateListingButton } from "./create-listing-button";
import { useDataTable } from "@/hooks/use-data-table";
import {
  DataTableDownload,
  DataTableViewOptions,
} from "@/components/data-table";
import { createDashboardListingsCsv } from "@/app/dashboard/listings/_lib/dashboard-listings-export";
import { APP_CONFIG, LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";

import { getColumns } from "./columns";
import { ListingBulkActions } from "./listing-bulk-actions";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import { PublicCatalogSearchResultCount } from "@/components/public-catalog-search/public-catalog-search-composable";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

export function ListingsTable({
  onEdit,
  onCreate,
}: {
  onEdit: (id: string) => void;
  onCreate: () => void;
}) {
  const firstRowsPaintedRef = React.useRef(false);
  const { listingRows: listings, lists } = useDashboardListingReadModel();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [viewingSelected, setViewingSelected] = React.useState(false);
  const selectedListings = React.useMemo(
    () => listings.filter((listing) => rowSelection[listing.id]),
    [listings, rowSelection],
  );
  const columns = React.useMemo(() => getColumns(onEdit), [onEdit]);
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
    data: viewingSelected ? selectedListings : listings,
    columns,
    storageKey: "listings-table",
    columnNames,
    config: {
      manualFiltering: viewingSelected,
      enableColumnFilters: !viewingSelected,
      getRowId: (row) => row.id,
      state: { rowSelection },
      onRowSelectionChange: (updater) => {
        const next = functionalUpdate(updater, rowSelection);
        setRowSelection(next);
        if (!Object.values(next).some(Boolean)) setViewingSelected(false);
        if (viewingSelected) table.setPageIndex(0);
      },
    },
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
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
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Flower2 />
          </EmptyMedia>
          <EmptyTitle role="heading" aria-level={2}>
            No listings
          </EmptyTitle>
          <EmptyDescription>
            Create your first listing to start selling.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateListingButton onCreate={onCreate} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="listing-table">
      <div hidden={viewingSelected}>
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
      </div>

      <div id="dashboard-listings-results" className="min-w-0">
        <DataTableLayout
          table={table}
          toolbar={
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                {viewingSelected ? (
                  <span className="text-sm font-medium">Selected listings</span>
                ) : (
                  <PublicCatalogSearchResultCount table={table} />
                )}
                <DataTableViewOptions table={table} />
              </div>
              <ListingBulkActions
                table={table}
                lists={lists}
                viewingSelected={viewingSelected}
                onViewSelected={() => {
                  table.setPageIndex(0);
                  setViewingSelected(!viewingSelected);
                }}
              />
            </div>
          }
          pagination={
            <>
              <DataTablePagination
                table={table}
                showSelectionCount={false}
                pageSizeOptions={
                  APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
                }
              />
              <DataTableDownload
                createCsv={createDashboardListingsCsv}
                table={table}
                filenamePrefix="listings"
              />
            </>
          }
          noResults={
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Flower2 />
                </EmptyMedia>
                <EmptyTitle role="heading" aria-level={2}>
                  No listings found
                </EmptyTitle>
                <EmptyDescription>
                  Adjust your filters or create a new listing.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <CreateListingButton onCreate={onCreate} />
              </EmptyContent>
            </Empty>
          }
        >
          <DataTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}
