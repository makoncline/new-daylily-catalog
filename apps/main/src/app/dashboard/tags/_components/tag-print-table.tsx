"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  type ColumnDef,
  type RowSelectionState,
  type Table,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/hooks/use-data-table";
import { APP_CONFIG } from "@/config/constants";
import {
  baseListingColumns,
  type ListingData,
} from "@/app/dashboard/listings/_components/columns";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import {
  TagDesignerPanel,
  type TagListingData,
} from "./tag-designer-panel";
import { DashboardListingFilterToolbar } from "@/app/dashboard/_components/dashboard-listing-filter-toolbar";

const tagPrintColumns: ColumnDef<ListingData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className="h-4 w-4"
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
        className="h-4 w-4"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  ...baseListingColumns,
];

function getSelectedIdsFromRowSelection(rowSelection: RowSelectionState) {
  return Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
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

  return listings
    .filter((listing) => selectedIdSet.has(listing.id))
    .map((listing) => ({
      id: listing.id,
      userId: listing.userId,
      title: listing.title,
      price: listing.price,
      privateNote: listing.privateNote,
      ahsListing: listing.ahsListing,
      listName: listing.lists.map((list) => list.title).join(", "),
    }));
}

interface SelectedListingsBadgesProps {
  table: Table<ListingData>;
  listingsById: Map<string, ListingData>;
}

function SelectedListingsBadges({ table, listingsById }: SelectedListingsBadgesProps) {
  const rowSelection = table.getState().rowSelection ?? {};
  const selectedIds = getSelectedIdsFromRowSelection(rowSelection);

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground shrink-0 text-xs font-medium">
        Selected ({selectedIds.length}):
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => table.setRowSelection({})}
      >
        Remove all
      </Button>
      {selectedIds.map((id) => {
        const listing = listingsById.get(id);
        const title = listing?.title ?? "(Unknown)";
        return (
          <Badge
            key={id}
            variant="secondary"
            className="group flex items-center gap-1 pr-1"
          >
            <span className="max-w-[12rem] truncate" title={title}>
              {title}
            </span>
            <button
              type="button"
              onClick={() => {
                table.setRowSelection((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
              }}
              className="hover:bg-muted rounded p-0.5 transition-colors"
              aria-label={`Deselect ${title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}

export function TagPrintTable() {
  const { listingRows: listings, lists, listingsById } =
    useDashboardListingReadModel();

  const table = useDataTable({
    data: listings,
    columns: tagPrintColumns,
    storageKey: "tag-print-table",
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
    },
  });

  const rowSelection = table.getState().rowSelection ?? {};
  const selectedListings = buildSelectedTagListingsForPrint({
    listings,
    rowSelection,
  });

  if (!listings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create listings first, then come back to print tags."
      />
    );
  }

  return (
    <div className="space-y-4">
      <TagDesignerPanel listings={selectedListings} />

      <SelectedListingsBadges table={table} listingsById={listingsById} />

      <DataTableLayout
        table={table}
        toolbar={
          <DashboardListingFilterToolbar
            table={table}
            lists={lists}
            listings={listings}
            placeholder="Filter listings to tag..."
          />
        }
        pagination={
          <DataTablePagination
            table={table}
            pageSizeOptions={APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS}
          />
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your search or list filters."
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
