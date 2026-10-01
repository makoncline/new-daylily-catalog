"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { type Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { deleteListing as deleteListingFromDb } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onEdit: (id: string) => void;
  publicUserSlug?: string;
}

function getAbsoluteListingUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export function DataTableRowActions<
  TData extends { id: string; slug?: string | null; userId?: string },
>({ row, onEdit, publicUserSlug }: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const {
    isDialogOpen: showDeleteDialog,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setShowDeleteDialog,
  } = useConfirmableAsyncAction({
    action: async () => {
      await deleteListingFromDb({ id: row.original.id });
      toast.success("Listing deleted successfully");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to delete listing");
    },
  });
  const publicListingPath = `/${publicUserSlug ?? row.original.userId ?? ""}/${
    row.original.slug ?? row.original.id
  }`;

  async function copyListingLink() {
    await navigator.clipboard.writeText(
      getAbsoluteListingUrl(publicListingPath),
    );
    capturePosthogEvent("listing_link_copied", {
      sellerId: row.original.userId,
      listingId: row.original.id,
      pageType: "dashboard_listings",
      sourcePage: window.location.pathname,
    });
    toast.success("Listing link copied");
    setOpen(false);
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid="listing-row-actions-trigger"
          >
            <DotsHorizontalIcon aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                onEdit(row.original.id);
              }}
              data-testid="listing-row-action-edit"
            >
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void copyListingLink();
              }}
            >
              <Copy aria-hidden="true" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setOpen(false);
                openDeleteDialog();
              }}
              data-testid="listing-row-action-delete"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void confirmDelete()}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </>
  );
}
