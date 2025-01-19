"use client";

import { type List } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEditList } from "./edit-list-dialog";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { TRPCClientError } from "@trpc/client";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataTableRowActionsProps {
  list: List & {
    _count: {
      listings: number;
    };
  };
}

export function DataTableRowActions({ list }: DataTableRowActionsProps) {
  const { editList } = useEditList();
  const router = useRouter();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showListingsAlert, setShowListingsAlert] = useState(false);

  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      router.refresh();
      toast({
        title: "List deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete list",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = () => {
    if (list._count.listings > 0) {
      setShowListingsAlert(true);
    } else {
      setShowDeleteDialog(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => editList(list.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            disabled={deleteList.isPending}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteList.isPending ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteList.mutate({ id: list.id });
          setShowDeleteDialog(false);
        }}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
      />

      <AlertDialog open={showListingsAlert} onOpenChange={setShowListingsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              This list has {list._count.listings} listing
              {list._count.listings === 1 ? "" : "s"} associated with it. Remove
              all listings first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
