"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useEditListing } from "@/app/dashboard/listings/_components/edit-listing-dialog";
import { getColumns as getListingsColumns } from "@/app/dashboard/listings/_components/columns";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { type ListingData } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";

interface ListListingsTableProps {
  listId: string;
}

const tableOptions = {
  pinnedColumns: {
    left: ["select", "title"],
    right: ["actions"],
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
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const removeListings = api.list.removeListings.useMutation({
    onSuccess: () => {
      toast.success("Listings removed from list");
      table.resetRowSelection();
      setShowDeleteDialog(false);
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        disabled={removeListings.isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove {selectedRows.length} selected
      </Button>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          removeListings.mutate({
            listId,
            listingIds: selectedRows.map((row) => row.original.id),
          });
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
  const { data: listings, isLoading } = api.list.getListings.useQuery({
    id: listId,
  });
  const { editListing } = useEditListing();

  const excludedColumns = ["lists", "actions"] as const;
  const columns = [
    ...getColumns(),
    ...getListingsColumns(editListing).filter(
      (column) =>
        !excludedColumns.includes(
          column.id as (typeof excludedColumns)[number],
        ),
    ),
  ];

  const table = useDataTable({
    data: listings ?? [],
    columns,
    ...tableOptions,
  });

  if (isLoading) {
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
    <div className="space-y-4">
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
        pagination={<DataTablePagination table={table} />}
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
