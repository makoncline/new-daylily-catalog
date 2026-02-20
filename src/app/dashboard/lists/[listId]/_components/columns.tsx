"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  baseListingColumns,
  type ListingData as DashboardListingData,
} from "@/app/dashboard/listings/_components/columns";

export type ListingData = DashboardListingData;

export function getColumns(): ColumnDef<ListingData>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          className="h-4 w-4"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          className="h-4 w-4"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...baseListingColumns,
  ];
}
