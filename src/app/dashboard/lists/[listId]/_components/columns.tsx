"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { type RouterOutputs } from "@/trpc/react";

type ListingData = RouterOutputs["listing"]["list"][number];

export function getColumns(): ColumnDef<ListingData>[] {
  return [
    {
      id: "select",
      size: 48,
      header: ({ table }) => (
        <div className="flex h-full items-center justify-center pl-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex h-full items-center justify-center pl-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
