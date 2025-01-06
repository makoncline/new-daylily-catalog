"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ListingForm } from "@/components/forms/listing-form";
import { type ListingGetOutput } from "@/server/api/routers/listing";
import { useState } from "react";

interface DataTableRowActionsProps {
  row: Row<ListingGetOutput>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only query when dialog is open
  const { data: listing } = api.listing.get.useQuery(
    { id: row.original.id },
    {
      initialData: row.original,
      enabled: dialogOpen,
    },
  );

  const deleteListing = api.listing.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      setDropdownOpen(false);
      router.refresh();
    },
  });

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-full w-full p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setDropdownOpen(false);
              }}
            >
              Quick Edit
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            onClick={() => {
              setDropdownOpen(false);
              router.push(`/dashboard/listings/${row.original.id}/edit`);
            }}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => {
              if (
                window.confirm("Are you sure you want to delete this listing?")
              ) {
                deleteListing.mutate({ id: row.original.id });
              } else {
                setDropdownOpen(false);
              }
            }}
          >
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit: {listing.name}</DialogTitle>
          <DialogDescription>
            Make changes to your listing here.
          </DialogDescription>
        </DialogHeader>
        <ListingForm listing={listing} onDelete={() => setDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
