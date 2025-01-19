"use client";

import { type List } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipCell } from "@/components/data-table/tooltip-cell";
import { DataTableRowActions } from "./row-actions";

type ListWithCount = List & {
  _count: {
    listings: number;
  };
};

export const columns: ColumnDef<ListWithCount>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <TooltipCell content={row.getValue("name")} />,
    enableHiding: false,
    enableSorting: true,
  },
  {
    id: "intro",
    accessorKey: "intro",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <TooltipCell content={row.getValue("intro")} />,
    enableSorting: true,
  },
  {
    id: "listingsCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Listings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    accessorFn: (row) => row._count.listings,
    cell: ({ row }) => (
      <div className="text-center">{row.original._count.listings}</div>
    ),
    enableSorting: true,
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
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {new Date(row.getValue("createdAt")).toLocaleDateString()}
      </div>
    ),
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions list={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
