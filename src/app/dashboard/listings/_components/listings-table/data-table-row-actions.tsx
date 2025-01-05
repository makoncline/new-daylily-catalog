"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";
import { Listing } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
import { EditListingPopover } from "../edit-listing-popover";
import { type ListingGetOutput } from "@/server/api/routers/listing";

interface DataTableRowActionsProps {
  row: Row<Listing>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const router = useRouter();
  const { data: listing } = api.listing.get.useQuery({ id: row.original.id });
  const deleteListing = api.listing.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      router.refresh();
    },
  });

  if (!listing) return null;

  return (
    <DropdownMenu>
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
        <EditListingPopover listing={listing} />
        <DropdownMenuItem
          onClick={() =>
            router.push(`/dashboard/listings/${row.original.id}/view`)
          }
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
            }
          }}
        >
          Delete
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
