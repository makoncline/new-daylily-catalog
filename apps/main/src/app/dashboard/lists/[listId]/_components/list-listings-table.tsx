"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import {
  DataTableLayout,
  DataTableLayoutSkeleton,
} from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FolderOpen } from "lucide-react";
import { getColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { H2, Muted } from "@/components/typography";
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
      await Promise.all(
        selectedListingIds.map((listingId) =>
          removeListingFromList({ listId, listingId }),
        ),
      );
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
        <Trash2 data-icon="inline-start" />
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
        actionLabel="Remove"
        description={`Are you sure you want to remove ${selectedRows.length} listing${selectedRows.length === 1 ? "" : "s"} from this list? The listings will stay in your catalog.`}
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DataTableGlobalFilter
            table={table}
            placeholder="Filter listings..."
          />
          <DataTableFilteredCount table={table} />
          <DataTableFilterReset table={table} />
        </div>
        <DataTableViewOptions table={table} />
      </div>
      {hasSelectedRows && (
        <div className="flex flex-wrap items-center gap-3">
          <SelectedItemsActions
            table={table}
            listId={listId}
            onMutationSuccess={onMutationSuccess}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.resetRowSelection()}
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  );
}

export function ListListingsTable({
  listId,
  onMutationSuccess,
}: ListListingsTableProps) {
  const {
    listingRows: listings,
    lists,
    isReady,
  } = useDashboardListingReadModel();
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

  if (!isReady) {
    return (
      <div role="status" aria-label="Loading list listings">
        <DataTableLayoutSkeleton />
      </div>
    );
  }

  if (!listingsInList.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle role="heading" aria-level={2}>
            No listings
          </EmptyTitle>
          <EmptyDescription>
            This list has no listings yet. Add some listings to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      data-testid="manage-list-table"
    >
      <div>
        <H2 className="text-lg">Listings</H2>
        <Muted>
          Select listings to remove them or use the table options to customize
          your view.
        </Muted>
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
          <Empty>
            <EmptyHeader>
              <EmptyTitle role="heading" aria-level={2}>
                No listings found
              </EmptyTitle>
              <EmptyDescription>Try adjusting your filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
