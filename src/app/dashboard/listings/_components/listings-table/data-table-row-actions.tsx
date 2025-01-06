"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";
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
import { type ListingGetOutput } from "@/server/api/routers/listing";
import { useState } from "react";

interface DataTableRowActionsProps {
  row: Row<ListingGetOutput>;
  onEdit?: (id: string | null) => void;
}

export function DataTableRowActions({ row, onEdit }: DataTableRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const deleteListing = api.listing.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            onEdit?.(row.original.id);
          }}
        >
          Quick Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
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
              setOpen(false);
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
