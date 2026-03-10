"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { type Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { deleteListing as deleteListingFromDb } from "@/app/dashboard/_lib/dashboard-db/listings-collection";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onEdit: (id: string) => void;
}

export function DataTableRowActions<TData extends { id: string }>({
  row,
  onEdit,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await deleteListingFromDb({ id: row.original.id });
      toast.success("Listing deleted successfully");
      setOpen(false);
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to delete listing");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted flex h-full w-full p-0"
            data-testid="listing-row-actions-trigger"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onEdit(row.original.id);
            }}
            data-testid="listing-row-action-edit"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              setOpen(false);
              setShowDeleteDialog(true);
            }}
            data-testid="listing-row-action-delete"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void handleDelete()}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </>
  );
}
