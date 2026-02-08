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
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onEdit: (id: string) => void;
}

export function DataTableRowActions<TData extends { id: string }>({
  row,
  onEdit,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteListing = api.listing.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to delete listing");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
            data-testid="listing-row-actions-trigger"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          forceMount
          className="w-[160px] data-[state=closed]:animate-none data-[state=open]:animate-none"
        >
          <DropdownMenuItem
            onSelect={() => onEdit(row.original.id)}
            data-testid="listing-row-action-edit"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => setShowDeleteDialog(true)}
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
        onConfirm={() => {
          deleteListing.mutate({ id: row.original.id });
        }}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </>
  );
}
