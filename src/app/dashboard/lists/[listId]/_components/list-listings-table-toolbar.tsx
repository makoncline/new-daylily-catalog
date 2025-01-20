"use client";

import { type Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";

interface ListListingsTableToolbarProps<TData> {
  table: Table<TData>;
  listId: string;
  filterPlaceholder?: string;
  showTableOptions?: boolean;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string; count?: number }[];
  }[];
}

export function ListListingsTableToolbar<TData extends { id: string }>({
  table,
  listId,
  filterPlaceholder,
  showTableOptions = true,
  filterableColumns,
}: ListListingsTableToolbarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const removeListings = api.list.removeListings.useMutation({
    onSuccess: () => {
      toast.success("Listings removed from list");
      table.resetRowSelection();
    },
  });

  return (
    <div className="space-y-4">
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              removeListings.mutate({
                listId,
                listingIds: selectedRows.map((row) => row.original.id),
              });
            }}
            disabled={removeListings.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove {selectedRows.length} selected
          </Button>
        </div>
      )}

      <DataTableToolbar
        table={table}
        filterPlaceholder={filterPlaceholder}
        showTableOptions={showTableOptions}
        filterableColumns={filterableColumns}
      />
    </div>
  );
}
