"use client";
import { type Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { type RouterOutputs } from "@/trpc/react";
import { ListDeleteDialog } from "@/components/list-delete-dialog";
import Link from "next/link";

import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

type List = RouterOutputs["dashboardV2"]["list"]["list"][number];

interface DataTableRowActionsProps {
  row: Row<List>;
  onEdit: (id: string) => void;
}

export function DataTableRowActions({ row, onEdit }: DataTableRowActionsProps) {
  const { deleteList } = useDashboardDb();
  const {
    isDialogOpen: showDeleteDialog,
    isPending: isDeleting,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setShowDeleteDialog,
  } = useConfirmableAsyncAction({
    action: async () => {
      await deleteList({ id: row.original.id });
      toast.success("List deleted", {
        description: "The list has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete list", {
        description: getErrorMessage(error),
      });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid="list-row-actions-trigger"
            disabled={isDeleting}
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild data-testid="list-row-action-manage">
              <Link href={`/dashboard/lists/${row.original.id}`}>
                <Settings />
                Manage
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(row.original.id)}
              data-testid="list-row-action-edit"
            >
              <Pencil />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={openDeleteDialog}
              data-testid="list-row-action-delete"
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ListDeleteDialog
        list={row.original}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
