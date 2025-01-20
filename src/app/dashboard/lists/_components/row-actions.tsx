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
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { type RouterOutputs } from "@/trpc/react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import Link from "next/link";
import { useEditList } from "./edit-list-dialog";

type List = RouterOutputs["list"]["list"][number];

interface DataTableRowActionsProps {
  row: Row<List>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { editList } = useEditList();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "List deleted",
        description: "The list has been deleted successfully.",
      });
      setShowDeleteDialog(false);
      router.refresh();
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/lists/${row.original.id}`}>
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editList(row.original.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
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
          deleteList.mutate({
            id: row.original.id,
          });
        }}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
      />
    </>
  );
}
