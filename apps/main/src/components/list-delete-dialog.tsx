"use client";

import Link from "next/link";
import { type ListCollectionItem } from "@/app/dashboard/_lib/dashboard-db/collections";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ListDeleteDialogProps {
  list: Pick<ListCollectionItem, "id" | "title" | "listings">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ListDeleteDialog({
  list,
  open,
  onOpenChange,
  onConfirm,
}: ListDeleteDialogProps) {
  if (list.listings.length === 0) {
    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        title="Delete List"
        description={`Delete ${list.title}? This action cannot be undone.`}
      />
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-11/12">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove listings first</AlertDialogTitle>
          <AlertDialogDescription>
            To delete “{list.title}”, first remove all listings from this list.
            Your listings and photos will stay in your catalog and other lists.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href={`/dashboard/lists/${list.id}`}>Manage list</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
