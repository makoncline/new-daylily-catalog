"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { formatPrice } from "@/lib/utils";
import { COLUMN_NAMES } from "@/config/constants";
import { TooltipCell } from "./tooltip-cell";
import { type ListingGetOutput } from "@/server/api/routers/listing";

/**
 * Helper function to safely get string values from a row
 * Returns null if the value is not a string
 */
const getStringValue = (
  row: Row<ListingGetOutput>,
  key: string,
): string | null => {
  const value = row.getValue(key);
  return typeof value === "string" ? value : null;
};

/**
 * Table column definitions
 * Organized into sections:
 * 1. Core columns (select, name, price, notes)
 * 2. AHS listing columns (hybridizer, year, etc.)
 * 3. Metadata columns (listing created/updated)
 * 4. Action column
 */
export const columns: ColumnDef<ListingGetOutput>[] = [
  // Core columns
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.name} />
    ),
    cell: ({ row }) => {
      const value = getStringValue(row, "name");
      return <TooltipCell content={value} />;
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "price",
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.price} />
    ),
    cell: ({ row }) => {
      const price = row.getValue("price");
      if (typeof price !== "number") return "-";
      return <TooltipCell content={formatPrice(price)} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "publicNote",
    accessorKey: "publicNote",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.publicNote} />
    ),
    cell: ({ row }) => (
      <TooltipCell content={getStringValue(row, "publicNote")} />
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "privateNote",
    accessorKey: "privateNote",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.privateNote} />
    ),
    cell: ({ row }) => (
      <TooltipCell content={getStringValue(row, "privateNote")} />
    ),
    enableSorting: true,
    enableHiding: true,
  },

  // AHS Listing columns
  {
    id: "hybridizer",
    accessorKey: "ahsListing.hybridizer",
    accessorFn: (row) => row.ahsListing?.hybridizer ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.hybridizer} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.hybridizer;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "year",
    accessorKey: "ahsListing.year",
    accessorFn: (row) => row.ahsListing?.year ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.year} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.year;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "scapeHeight",
    accessorKey: "ahsListing.scapeHeight",
    accessorFn: (row) => row.ahsListing?.scapeHeight ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.scapeHeight} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.scapeHeight;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "bloomSize",
    accessorKey: "ahsListing.bloomSize",
    accessorFn: (row) => row.ahsListing?.bloomSize ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.bloomSize} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.bloomSize;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "bloomSeason",
    accessorKey: "ahsListing.bloomSeason",
    accessorFn: (row) => row.ahsListing?.bloomSeason ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.bloomSeason} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.bloomSeason;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "ploidy",
    accessorKey: "ahsListing.ploidy",
    accessorFn: (row) => row.ahsListing?.ploidy ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.ploidy} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.ploidy;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "foliageType",
    accessorKey: "ahsListing.foliageType",
    accessorFn: (row) => row.ahsListing?.foliageType ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.foliageType} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.foliageType;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "bloomHabit",
    accessorKey: "ahsListing.bloomHabit",
    accessorFn: (row) => row.ahsListing?.bloomHabit ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.bloomHabit} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.bloomHabit;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "color",
    accessorKey: "ahsListing.color",
    accessorFn: (row) => row.ahsListing?.color ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.color} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.color;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "form",
    accessorKey: "ahsListing.form",
    accessorFn: (row) => row.ahsListing?.form ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.form} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.form;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "fragrance",
    accessorKey: "ahsListing.fragrance",
    accessorFn: (row) => row.ahsListing?.fragrance ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.fragrance} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.fragrance;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "budcount",
    accessorKey: "ahsListing.budcount",
    accessorFn: (row) => row.ahsListing?.budcount ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.budcount} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.budcount;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "branches",
    accessorKey: "ahsListing.branches",
    accessorFn: (row) => row.ahsListing?.branches ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.branches} />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.branches;
      return <TooltipCell content={value ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Metadata columns
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.createdAt} />
    ),
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
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={COLUMN_NAMES.updatedAt} />
    ),
    cell: ({ row }) => {
      const date = row.original.updatedAt;
      if (!(date instanceof Date)) return "-";
      const formatted = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return <TooltipCell content={formatted} />;
    },
    enableSorting: true,
    enableHiding: true,
  },

  // Action column
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
    enableHiding: false,
  },
];
