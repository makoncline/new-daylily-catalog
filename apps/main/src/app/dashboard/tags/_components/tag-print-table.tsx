"use client";

import * as React from "react";
import { Tags, X } from "lucide-react";
import {
  type ColumnDef,
  type RowSelectionState,
  type Table,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DataTable } from "@/components/data-table/data-table";
import {
  DataTableLayout,
  DataTableLayoutSkeleton,
} from "@/components/data-table/data-table-layout";
import { DataTableViewOptions } from "@/components/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/hooks/use-data-table";
import { APP_CONFIG } from "@/config/constants";
import {
  dashboardListingColumns,
  type ListingData,
} from "@/app/dashboard/listings/_components/columns";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import { TagDesignerPanel, type TagListingData } from "./tag-designer-panel";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import { PublicCatalogSearchResultCount } from "@/components/public-catalog-search/public-catalog-search-composable";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
  DASHBOARD_CATALOG_SEARCH_SECTION_DEFINITIONS,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";

const tagPrintColumns: ColumnDef<ListingData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  ...dashboardListingColumns,
];

function getSelectedIdsFromRowSelection(rowSelection: RowSelectionState) {
  const selectedIds = [];

  for (const [id, selected] of Object.entries(rowSelection)) {
    if (selected) {
      selectedIds.push(id);
    }
  }

  return selectedIds;
}

interface TagPrintSelectableListing {
  id: string;
  userId?: string | null;
  title: string;
  price?: number | null;
  privateNote?: string | null;
  ahsListing: ListingData["ahsListing"];
  lists: ListingData["lists"];
}

export function buildSelectedTagListingsForPrint({
  listings,
  rowSelection,
}: {
  listings: TagPrintSelectableListing[];
  rowSelection: RowSelectionState;
}): TagListingData[] {
  const selectedIdSet = new Set(getSelectedIdsFromRowSelection(rowSelection));

  const selectedListings: TagListingData[] = [];

  for (const listing of listings) {
    if (!selectedIdSet.has(listing.id)) {
      continue;
    }

    selectedListings.push({
      id: listing.id,
      userId: listing.userId,
      title: listing.title,
      price: listing.price,
      privateNote: listing.privateNote,
      ahsListing: listing.ahsListing,
      listName: listing.lists.map((list) => list.title).join(", "),
    });
  }

  return selectedListings;
}

interface SelectedListingsBadgesProps {
  table: Table<ListingData>;
  listingsById: Map<string, ListingData>;
}

function SelectedListingsBadges({
  table,
  listingsById,
}: SelectedListingsBadgesProps) {
  const rowSelection = table.getState().rowSelection ?? {};
  const selectedIds = getSelectedIdsFromRowSelection(rowSelection);

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <span className="text-muted-foreground shrink-0 text-sm">
        Selected ({selectedIds.length}):
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => table.setRowSelection({})}
      >
        Remove all
      </Button>
      {selectedIds.map((id) => {
        const listing = listingsById.get(id);
        const title = listing?.title ?? "(Unknown)";
        return (
          <Button
            key={id}
            variant="secondary"
            size="sm"
            className="max-w-52"
            title={title}
            aria-label={`Deselect ${title}`}
            onClick={() => {
              table.setRowSelection((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
            }}
          >
            <span className="truncate">{title}</span>
            <X data-icon="inline-end" />
          </Button>
        );
      })}
    </div>
  );
}

export function TagPrintTable() {
  const {
    listingRows: listings,
    lists,
    listingsById,
    isReady,
  } = useDashboardListingReadModel();
  const [searchMode, setSearchMode] = useLocalStorage<PublicCatalogSearchMode>(
    "dashboard-tags-search-mode",
    "basic",
  );
  const [searchCollapsed, setSearchCollapsed] = useLocalStorage(
    "dashboard-tags-search-collapsed",
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
  const listOptions = React.useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );
  const facetOptions = React.useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  const table = useDataTable({
    data: listings,
    columns: tagPrintColumns,
    storageKey: "tag-print-table",
    // Global search can also contain private-note text. Keep all filters off URLs.
    syncUrl: false,
    columnNames,
    pinnedColumns: {
      left: ["select", "title"],
      right: [],
    },
    config: {
      enableRowSelection: true,
      getRowId: (row) => row.id,
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

  const rowSelection = table.getState().rowSelection ?? {};
  const selectedListings = buildSelectedTagListingsForPrint({
    listings,
    rowSelection,
  });
  const filteredIds = new Set(
    table.getFilteredRowModel().rows.map((row) => row.id),
  );
  const hiddenSelectedCount = selectedListings.filter(
    (listing) => !filteredIds.has(listing.id),
  ).length;

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

  if (!isReady && !listings.length) {
    return (
      <div role="status" aria-label="Loading listings">
        <DataTableLayoutSkeleton />
      </div>
    );
  }

  if (!listings.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tags />
          </EmptyMedia>
          <EmptyTitle>No listings</EmptyTitle>
          <EmptyDescription>
            Create listings first, then come back to print tags.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    // eslint-disable-next-line shadcn/no-unknown-classes -- PostHog privacy marker; no CSS is needed.
    <div className="ph-no-capture flex flex-col gap-6" data-sentry-mask>
      <TagDesignerPanel listings={selectedListings} />
      <section aria-labelledby="choose-listings-title" className="space-y-4">
        <div className="space-y-2">
          <h2 id="choose-listings-title" className="text-base font-semibold">
            Choose listings
          </h2>
          <p className="text-muted-foreground text-sm">
            Select the listings to include in your tags. Selected listings stay
            included when you change filters.
          </p>
        </div>
        <PublicCatalogSearchAdvancedPanel
          advancedSectionsColumns={3}
          sectionDefinitions={DASHBOARD_CATALOG_SEARCH_SECTION_DEFINITIONS}
          framed={false}
          table={table}
          listOptions={listOptions}
          facetOptions={facetOptions}
          mode={searchMode}
          onModeChange={setSearchMode}
          collapsed={searchCollapsed}
          onCollapsedChange={setSearchCollapsed}
          onSearchSubmit={() =>
            document
              .getElementById("tag-listings-results")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
        <SelectedListingsBadges table={table} listingsById={listingsById} />
        {hiddenSelectedCount > 0 ? (
          <p className="text-muted-foreground text-sm" role="status">
            {hiddenSelectedCount} selected{" "}
            {hiddenSelectedCount === 1 ? "listing is" : "listings are"} hidden
            by filters and will be included in your tags.
          </p>
        ) : null}
        <div id="tag-listings-results" className="min-w-0">
          <DataTableLayout
            table={table}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PublicCatalogSearchResultCount table={table} />
                <DataTableViewOptions table={table} />
              </div>
            }
            pagination={
              <DataTablePagination
                table={table}
                pageSizeOptions={
                  APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
                }
              />
            }
            noResults={
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No listings found</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your search or filters.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          >
            <DataTable table={table} />
          </DataTableLayout>
        </div>
      </section>
    </div>
  );
}
