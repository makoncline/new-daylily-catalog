"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
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
import {
  loadMissingList,
  removeListingsFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { loadListingsByIds } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import { getErrorMessage } from "@/lib/error-utils";

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
  consumeAutomaticReview,
}: {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
  consumeAutomaticReview?: () => boolean;
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
      for (let offset = 0; offset < selectedListingIds.length; offset += 20) {
        try {
          await removeListingsFromList({
            listId,
            listingIds: selectedListingIds.slice(offset, offset + 20),
          });
          onMutationSuccess?.();
        } catch (error) {
          throw new Error(
            `${offset} removals were confirmed. Reload the list before you try again. ${getErrorMessage(error)}`,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Listings removed from list");
      table.resetRowSelection();
    },
    onError: (error) => {
      toast.error("Could not finish removing listings", {
        description: getErrorMessage(error),
      });
    },
  });

  React.useEffect(() => {
    if (selectedListingIds.length > 0 && consumeAutomaticReview?.()) {
      openDeleteDialog();
    }
  }, [consumeAutomaticReview, openDeleteDialog, selectedListingIds.length]);

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
        description={`Remove these listings from the list: ${selectedRows.map((row) => row.original.title).join("; ")}. The listings will stay in your catalog.`}
        actionLabel="Remove"
      />
    </>
  );
}

interface ListingsTableToolbarProps {
  table: Table<ListingData>;
  listId: string;
  onMutationSuccess?: () => void;
  consumeAutomaticReview?: () => boolean;
}

function ListingsTableToolbar({
  table,
  listId,
  onMutationSuccess,
  consumeAutomaticReview,
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
            consumeAutomaticReview={consumeAutomaticReview}
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
  const searchParams = useSearchParams();
  const requestedRemoval = searchParams?.get("remove") ?? "";
  const requestedIds = React.useMemo(
    () => requestedRemoval.split(",").filter(Boolean),
    [requestedRemoval],
  );
  const [loadedRemoval, setLoadedRemoval] = React.useState("");
  React.useEffect(() => {
    if (!requestedIds.length || requestedIds.length > 20) return;
    let cancelled = false;
    void Promise.all([loadMissingList(listId), loadListingsByIds(requestedIds)])
      .then(() => {
        if (!cancelled) setLoadedRemoval(requestedRemoval);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the removal review.");
      });
    return () => {
      cancelled = true;
    };
  }, [listId, requestedIds, requestedRemoval]);
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
    config: { getRowId: (row) => row.id },
  });

  const validRemoval =
    loadedRemoval === requestedRemoval &&
    requestedIds.length > 0 &&
    requestedIds.length <= 20 &&
    requestedIds.every(
      (id) =>
        listingIdsInList.has(id) &&
        listingsInList.some((listing) => listing.id === id),
    );
  const appliedRemovalRef = React.useRef("");
  const reviewedRemovalRef = React.useRef("");
  const consumeAutomaticReview = React.useCallback(() => {
    const reviewKey = `${listId}:${requestedRemoval}`;
    if (!validRemoval || reviewedRemovalRef.current === reviewKey) return false;
    reviewedRemovalRef.current = reviewKey;
    return true;
  }, [listId, requestedRemoval, validRemoval]);
  React.useEffect(() => {
    if (!requestedRemoval) {
      appliedRemovalRef.current = "";
      reviewedRemovalRef.current = "";
      return;
    }
    if (!validRemoval || appliedRemovalRef.current === requestedRemoval) return;
    appliedRemovalRef.current = requestedRemoval;
    table.setGlobalFilter("");
    table.setColumnFilters([]);
    table.setRowSelection(
      Object.fromEntries(requestedIds.map((id) => [id, true])),
    );
  }, [validRemoval, requestedIds, requestedRemoval, table]);

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
        {loadedRemoval === requestedRemoval &&
          requestedRemoval &&
          !validRemoval && (
            <p role="alert" className="text-destructive text-sm">
              This removal link is no longer current. Ask for a new link.
            </p>
          )}
      </div>

      <DataTableLayout
        table={table}
        toolbar={
          <ListingsTableToolbar
            table={table}
            listId={listId}
            onMutationSuccess={onMutationSuccess}
            consumeAutomaticReview={consumeAutomaticReview}
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
