"use client";

import { type List } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListActions } from "./list-actions";
import { TABLE_CONFIG } from "@/config/constants";
import { DataTable, TooltipCell } from "@/components/data-table";

interface ListsTableProps {
  initialLists: (List & {
    _count: {
      listings: number;
    };
  })[];
}

export function ListsTable({ initialLists }: ListsTableProps) {
  const columns: ColumnDef<ListsTableProps["initialLists"][number]>[] = [
    {
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
      cell: ({ row }) => <TooltipCell content={row.original.name} />,
    },
    {
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
      cell: ({ row }) => <TooltipCell content={row.original.intro} />,
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
        <div
          style={{
            minWidth: `${TABLE_CONFIG.MIN_COLUMN_WIDTH}px`,
            maxWidth: `${TABLE_CONFIG.MIN_COLUMN_WIDTH}px`,
          }}
          className="text-center"
        >
          {row.original._count.listings}
        </div>
      ),
    },
    {
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
        <div
          style={{
            minWidth: `${TABLE_CONFIG.MIN_COLUMN_WIDTH}px`,
            maxWidth: `${TABLE_CONFIG.MIN_COLUMN_WIDTH}px`,
          }}
          className="whitespace-nowrap"
        >
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <ListActions list={row.original} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={initialLists}
      filterPlaceholder="Filter lists..."
      showTableOptions={false}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        pagination: {
          pageIndex: TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_INDEX,
          pageSize: TABLE_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
        },
      }}
    />
  );
}
