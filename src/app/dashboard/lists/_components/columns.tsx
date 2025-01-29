"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { TooltipCell } from "@/components/data-table/tooltip-cell";
import { DataTableRowActions } from "./row-actions";
import { type RouterOutputs } from "@/trpc/react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { LIST_TABLE_COLUMN_NAMES } from "@/config/constants";
import { P } from "@/components/typography";

export type List = RouterOutputs["list"]["list"][number];

export const columns: ColumnDef<List>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LIST_TABLE_COLUMN_NAMES.title}
      />
    ),
    cell: ({ row }) => <TooltipCell content={row.getValue("title")} />,
    enableHiding: false,
    enableSorting: true,
  },
  {
    id: "description",
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LIST_TABLE_COLUMN_NAMES.description}
      />
    ),
    cell: ({ row }) => <TooltipCell content={row.getValue("description")} />,
    enableSorting: true,
  },
  {
    id: "listingsCount",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LIST_TABLE_COLUMN_NAMES.listingsCount}
      />
    ),
    accessorFn: (row) => row._count.listings,
    cell: ({ row }) => <div className="">{row.original._count.listings}</div>,
    enableSorting: true,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LIST_TABLE_COLUMN_NAMES.createdAt}
      />
    ),
    cell: ({ row }) => (
      <P className="whitespace-nowrap">
        {new Date(row.getValue("createdAt")).toLocaleDateString()}
      </P>
    ),
    enableSorting: true,
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LIST_TABLE_COLUMN_NAMES.updatedAt}
      />
    ),
    cell: ({ row }) => (
      <P className="whitespace-nowrap">
        {new Date(row.getValue("updatedAt")).toLocaleDateString()}
      </P>
    ),
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];
