"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { type RouterOutputs } from "@/trpc/react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { TooltipCell } from "@/components/data-table/tooltip-cell";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { fuzzyFilter } from "@/lib/table-utils";
import { formatPrice } from "@/lib/utils";

export type ListingData = RouterOutputs["dashboardDb"]["listing"]["list"][number];

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
    {
      id: "title",
      accessorKey: "title",
      meta: {
        title: LISTING_TABLE_COLUMN_NAMES.title,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={LISTING_TABLE_COLUMN_NAMES.title}
          enableFilter
        />
      ),
      cell: ({ row }) => {
        const title = row.getValue("title");
        return (
          <TooltipCell
            content={typeof title === "string" ? title : null}
            lines={3}
          />
        );
      },
      filterFn: fuzzyFilter,
      sortingFn: "fuzzySort",
      enableSorting: true,
      enableHiding: false,
    },
    {
      id: "price",
      accessorKey: "price",
      meta: {
        title: LISTING_TABLE_COLUMN_NAMES.price,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={LISTING_TABLE_COLUMN_NAMES.price}
        />
      ),
      cell: ({ row }) => {
        const price = row.getValue("price");
        if (typeof price !== "number") return "-";
        return <TooltipCell content={formatPrice(price)} />;
      },
      enableSorting: true,
      enableHiding: true,
    },
  ];
}
