"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipCell } from "./tooltip-cell";
import { DataTableRowActions } from "./data-table-row-actions";
import { type ListingGetOutput } from "@/server/api/routers/listing";
import { COLUMN_NAMES } from "@/config/constants";
import { formatPrice } from "@/lib/utils";

export function getColumns(
  onEdit?: (id: string | null) => void,
): ColumnDef<ListingGetOutput>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.name}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <TooltipCell content={row.original.name} />,
    },
    {
      id: "price",
      accessorKey: "price",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.price}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = row.getValue("price");
        if (typeof price !== "number") return "-";
        return <TooltipCell content={formatPrice(price)} />;
      },
    },
    {
      id: "publicNote",
      accessorKey: "publicNote",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.publicNote}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <TooltipCell content={row.original.publicNote} />,
    },
    {
      id: "privateNote",
      accessorKey: "privateNote",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.privateNote}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <TooltipCell content={row.original.privateNote} />,
    },
    {
      id: "hybridizer",
      accessorKey: "ahsListing.hybridizer",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.hybridizer}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <TooltipCell content={row.original.ahsListing?.hybridizer ?? null} />
      ),
    },
    {
      id: "year",
      accessorKey: "ahsListing.year",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.year}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <TooltipCell content={row.original.ahsListing?.year ?? null} />
      ),
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {COLUMN_NAMES.createdAt}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!(date instanceof Date)) return "-";
        const formatted = date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return <TooltipCell content={formatted} />;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} />,
    },
  ];
}
