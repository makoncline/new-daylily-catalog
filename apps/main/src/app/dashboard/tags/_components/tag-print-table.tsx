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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { TagDesignerPanel, type TagListingData } from "./tag-designer-panel";
import { DashboardListingFilterToolbar } from "@/app/dashboard/_components/dashboard-listing-filter-toolbar";

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
  ...baseListingColumns,
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
  } = useDashboardListingReadModel();

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
    <div className="flex flex-col gap-6">
      <TagDesignerPanel listings={selectedListings} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Choose listings</h2>
          </CardTitle>
          <CardDescription>
            Select the listings to include in your tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
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
                      Try adjusting your search or list filters.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              }
            >
              <DataTable table={table} />
            </DataTableLayout>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
