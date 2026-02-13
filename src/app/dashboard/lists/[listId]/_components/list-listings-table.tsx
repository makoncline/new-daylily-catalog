"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { type ListingData } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableDownload } from "@/components/data-table";
import { slugify } from "@/lib/utils/slugify";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  listsCollection,
  removeListingFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";

interface ListListingsTableProps {
  listId: string;
}

const tableOptions = {
  pinnedColumns: {
    left: ["select", "title"],
    right: [],
  },
  storageKey: "list-listings-table",
};

function SelectedItemsActions({
  table,
  listId,
}: {
  table: Table<ListingData>;
  listId: string;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedListingIds = selectedRows.map((row) => row.original.id);

  const handleRemoveSelected = async () => {
    if (!selectedListingIds.length || isPending) return;

    setIsPending(true);
    try {
      for (const listingId of selectedListingIds) {
        await removeListingFromList({ listId, listingId });
      }

      toast.success("Listings removed from list");
      table.resetRowSelection();
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to remove listings from list");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove {selectedRows.length} selected
      </Button>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void handleRemoveSelected()}
        title="Remove Listings"
        description={`Are you sure you want to remove ${selectedRows.length} listing${selectedRows.length === 1 ? "" : "s"} from this list? This action cannot be undone.`}
      />
    </>
  );
}

interface ListingsTableToolbarProps {
  table: Table<ListingData>;
  listId: string;
}

function ListingsTableToolbar({ table, listId }: ListingsTableToolbarProps) {
  const hasSelectedRows = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <DataTableGlobalFilter
            table={table}
            placeholder="Filter listings..."
          />
          <DataTableFilteredCount table={table} />
          <DataTableFilterReset table={table} />
          {hasSelectedRows && (
            <SelectedItemsActions table={table} listId={listId} />
          )}
          <div className="flex-1" />
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}

export function ListListingsTable({ listId }: ListListingsTableProps) {
  const { data: lists = [], isReady: isListsReady } = useLiveQuery(
    (q) =>
      q.from({ list: listsCollection }).where(({ list }) => eq(list.id, listId)),
    [listId],
  );
  const list = lists[0] ?? null;

  const { data: allListings = [], isReady: isListingsReady } = useLiveQuery((q) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }) => listing.createdAt, "desc"),
  );

  const listings = React.useMemo(() => {
    if (!list?.listings?.length) return [];

    const ids = new Set(list.listings.map(({ id }) => id));
    return allListings.filter((listing) => ids.has(listing.id));
  }, [allListings, list]);

  const columns = getColumns();

  const table = useDataTable({
    data: listings ?? [],
    columns,
    ...tableOptions,
  });

  if (!isListsReady || !isListingsReady) {
    return <ListingsTableSkeleton />;
  }

  if (!listings?.length) {
    return (
      <EmptyState
        title="No listings"
        description="This list has no listings yet. Add some listings to get started."
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="manage-list-table">
      <div>
        <Label>Listings</Label>
        <p className="text-[0.8rem] text-muted-foreground">
          Select listings to remove them or use the table options to customize
          your view.
        </p>
      </div>

      <DataTableLayout
        table={table}
        toolbar={<ListingsTableToolbar table={table} listId={listId} />}
        pagination={
          <>
            <DataTablePagination table={table} />
            <DataTableDownload
              table={table}
              filenamePrefix={`${slugify(list?.title ?? listId)}-listings`}
            />
          </>
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters"
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
