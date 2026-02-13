"use client";

import { useState } from "react";
import { type Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { type RouterOutputs } from "@/trpc/react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import Link from "next/link";
import { useEditList } from "./edit-list-dialog";
import { deleteList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];

interface DataTableRowActionsProps {
  row: Row<List>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { editList } = useEditList();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteList({ id: row.original.id });
      toast.success("List deleted", {
        description: "The list has been deleted successfully.",
      });
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to delete list", {
        description: "An error occurred while deleting your list",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
            data-testid="list-row-actions-trigger"
            disabled={isDeleting}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem asChild data-testid="list-row-action-manage">
            <Link href={`/dashboard/lists/${row.original.id}`}>
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editList(row.original.id)}
            data-testid="list-row-action-edit"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
            data-testid="list-row-action-delete"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
      />
    </>
  );
}
