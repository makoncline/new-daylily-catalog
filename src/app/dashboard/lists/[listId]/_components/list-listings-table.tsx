"use client";

import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { api } from "@/trpc/react";
import { ListingsTableSkeleton } from "./listings-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Table, ColumnDef } from "@tanstack/react-table";
import { useEditListing } from "@/app/dashboard/listings/_components/edit-listing-dialog";
import { getColumns as getListingsColumns } from "@/app/dashboard/listings/_components/listings-table/columns";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { type RouterOutputs } from "@/trpc/react";

type ListingData = RouterOutputs["listing"]["list"][number];

interface ListListingsTableProps {
  listId: string;
}

export function ListListingsTable({ listId }: ListListingsTableProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table<ListingData>>();

  const { data: listings, isLoading } = api.list.getListings.useQuery({
    id: listId,
  });

  const excludedColumns = ["lists", "actions"] as const;
  const { editListing } = useEditListing();
  const columns: ColumnDef<ListingData>[] = [
    ...getColumns(),
    ...getListingsColumns(editListing).filter(
      (column) =>
        !excludedColumns.includes(
          column.id as (typeof excludedColumns)[number],
        ),
    ),
  ];

  const removeListings = api.list.removeListings.useMutation({
    onSuccess: () => {
      toast.success("Listings removed from list");
      selectedTable?.resetRowSelection();
      setShowDeleteDialog(false);
    },
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

      <DataTable
        columns={columns}
        data={listings}
        options={{
          pinnedColumns: {
            left: 2,
            right: 0,
          },
          storageKey: "list-listings-table",
        }}
        selectedItemsActions={(table: Table<ListingData>) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          return (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setSelectedTable(table);
                setShowDeleteDialog(true);
              }}
              disabled={removeListings.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove {selectedRows.length} selected
            </Button>
          );
        }}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          if (selectedTable) {
            const selectedRows =
              selectedTable.getFilteredSelectedRowModel().rows;
            removeListings.mutate({
              listId,
              listingIds: selectedRows.map((row) => row.original.id),
            });
          }
        }}
        title="Remove Listings"
        description={`Are you sure you want to remove ${selectedTable?.getFilteredSelectedRowModel().rows.length} listing${selectedTable?.getFilteredSelectedRowModel().rows.length === 1 ? "" : "s"} from this list? This action cannot be undone.`}
      />
    </div>
  );
}
