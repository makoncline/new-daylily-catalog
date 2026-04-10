"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Label } from "@/components/ui/label";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { type ListingData } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import { DataTableDownload } from "@/components/data-table";
import { slugify } from "@/lib/utils/slugify";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { removeListingFromList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";

interface ListListingsTableProps {
  listId: string;
  onMutationSuccess?: () => void;
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
  onMutationSuccess,
}: {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
}) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedListingIds = selectedRows.map((row) => row.original.id);
  const {
    isDialogOpen: showDeleteDialog,
    isPending,
    openDialog: openDeleteDialog,
    runAction: confirmRemoveSelected,
    setIsDialogOpen: setShowDeleteDialog,
  } = useConfirmableAsyncAction({
    action: async () => {
      for (const listingId of selectedListingIds) {
        await removeListingFromList({ listId, listingId });
      }
    },
    onSuccess: () => {
      toast.success("Listings removed from list");
      onMutationSuccess?.();
      table.resetRowSelection();
    },
    onError: () => {
      toast.error("Failed to remove listings from list");
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={openDeleteDialog}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove {selectedRows.length} selected
      </Button>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          if (!selectedListingIds.length) {
            return;
          }

          void confirmRemoveSelected();
        }}
        title="Remove Listings"
        description={`Are you sure you want to remove ${selectedRows.length} listing${selectedRows.length === 1 ? "" : "s"} from this list? This action cannot be undone.`}
      />
    </>
  );
}

interface ListingsTableToolbarProps {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
}

function ListingsTableToolbar({
  table,
  listId,
  onMutationSuccess,
}: ListingsTableToolbarProps) {
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
            <SelectedItemsActions
              table={table}
              listId={listId}
              onMutationSuccess={onMutationSuccess}
            />
          )}
          <div className="flex-1" />
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}

export function ListListingsTable({
  listId,
  onMutationSuccess,
}: ListListingsTableProps) {
  const { listingRows: listings, lists } = useDashboardListingReadModel();
  const list = lists.find((row) => row.id === listId) ?? null;

  const listingIdsInList = React.useMemo(() => {
    if (!list?.listings?.length) return new Set<string>();
    return new Set(list.listings.map(({ id }) => id));
  }, [list]);
  const listingsInList = React.useMemo(
    () => listings.filter((listing) => listingIdsInList.has(listing.id)),
    [listingIdsInList, listings],
  );

  const columns = getColumns();

  const table = useDataTable({
    data: listingsInList,
    columns,
    ...tableOptions,
  });

  if (!listingsInList.length) {
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
        toolbar={
          <ListingsTableToolbar
            table={table}
            listId={listId}
            onMutationSuccess={onMutationSuccess}
          />
        }
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
