"use client";

import {
  DataTableColumnHeader,
  TooltipCell,
  DataTableRowActions,
} from "@/components/data-table";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { formatPrice, formatAhsListingSummary } from "@/lib/utils";
import { type Row, type ColumnDef } from "@tanstack/react-table";
import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import React from "react";
import { fuzzyFilter } from "@/lib/table-utils";
import { type ContextListing } from "@/server/db/user-data";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";

type ListingData = ContextListing;
type ListingRow = Row<ListingData>;

/**
 * Helper function to safely get string values from a row
 * Returns null if the value is not a string
 */
const getStringValue = (row: ListingRow, key: string): string | null => {
  const value = row.getValue(key);
  return typeof value === "string" ? value : null;
};

export const baseListingColumns: ColumnDef<ListingData>[] = [
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
      const value = getStringValue(row, "title");
      return <TooltipCell content={value} lines={3} />;
    },
    filterFn: fuzzyFilter,
    sortingFn: "fuzzySort",
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "images",
    accessorKey: "images",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.images,
    },
    accessorFn: (row) =>
      (row.images?.length ?? 0) + (row.ahsListing?.ahsImageUrl ? 1 : 0),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="sr-only">{LISTING_TABLE_COLUMN_NAMES.images}</span>
          </span>
        }
      />
    ),
    cell: ({ row }) => {
      const images = row.original.images;
      const ahsImageUrl = row.original.ahsListing?.ahsImageUrl;
      if (!images?.length && !ahsImageUrl) return null;
      return <TableImagePreview images={images} ahsImageUrl={ahsImageUrl} />;
    },
    enableSorting: true,
    enableHiding: true,
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
    filterFn: (row, id, filterValue) => {
      if (!filterValue) return true;
      const price = row.getValue(id);
      return typeof price === "number" && price > 0;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "description",
    accessorKey: "description",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.description,
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.description}
        enableFilter
      />
    ),
    cell: ({ row }) => (
      <TooltipCell content={getStringValue(row, "description")} lines={3} />
    ),
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "privateNote",
    accessorKey: "privateNote",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.privateNote,
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.privateNote}
        enableFilter
      />
    ),
    cell: ({ row }) => (
      <TooltipCell content={getStringValue(row, "privateNote")} />
    ),
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "lists",
    accessorKey: "lists",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.lists,
    },
    accessorFn: (row) => {
      if (!row.lists?.length) return "";
      return row.lists.map((list) => list.title).join(", ");
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.lists}
      />
    ),
    cell: ({ row }) => {
      const lists = row.original.lists;
      if (!lists || lists.length === 0) return null;

      return (
        <div className="flex items-center gap-2">
          {lists.map((list) => (
            <TruncatedListBadge
              key={list.id}
              name={list.title}
              className="shrink-0 text-xs font-normal"
            />
          ))}
        </div>
      );
    },
    filterFn: (row, id, filterValue: string[]) => {
      if (!filterValue.length) return true;
      return row.original.lists.some((list) => filterValue.includes(list.id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  // status column. with status in a badge
  {
    id: "status",
    accessorKey: "status",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.status,
    },
    accessorFn: (row) => row.status,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.status}
      />
    ),
    cell: ({ row }) =>
      row.original.status ? (
        <Badge variant="secondary" className="text-xs font-normal">
          {row.original.status}
        </Badge>
      ) : null,
    enableSorting: true,
    enableHiding: true,
  },

  // AHS Listing columns
  {
    id: "summary",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.summary,
    },
    accessorFn: (row) => formatAhsListingSummary(row.ahsListing),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.summary}
        enableFilter
      />
    ),
    cell: ({ row }) => {
      const value: string | null = row.getValue("summary");
      return <TooltipCell content={value} lines={3} />;
    },
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "hybridizer",
    accessorKey: "ahsListing.hybridizer",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.hybridizer,
    },
    accessorFn: (row) => row.ahsListing?.hybridizer ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.hybridizer}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.year,
    },
    accessorFn: (row) => row.ahsListing?.year ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.year}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.scapeHeight,
    },
    accessorFn: (row) => row.ahsListing?.scapeHeight ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.scapeHeight}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.bloomSize,
    },
    accessorFn: (row) => row.ahsListing?.bloomSize ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.bloomSize}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.bloomSeason,
    },
    accessorFn: (row) => row.ahsListing?.bloomSeason ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.bloomSeason}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.ploidy,
    },
    accessorFn: (row) => row.ahsListing?.ploidy ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.ploidy}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.foliageType,
    },
    accessorFn: (row) => row.ahsListing?.foliageType ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.foliageType}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.bloomHabit,
    },
    accessorFn: (row) => row.ahsListing?.bloomHabit ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.bloomHabit}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.color,
    },
    accessorFn: (row) => row.ahsListing?.color ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.color}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.ahsListing?.color;
      return <TooltipCell content={value ?? null} lines={3} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "form",
    accessorKey: "ahsListing.form",
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.form,
    },
    accessorFn: (row) => row.ahsListing?.form ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.form}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.fragrance,
    },
    accessorFn: (row) => row.ahsListing?.fragrance ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.fragrance}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.budcount,
    },
    accessorFn: (row) => row.ahsListing?.budcount ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.budcount}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.branches,
    },
    accessorFn: (row) => row.ahsListing?.branches ?? null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.branches}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.createdAt,
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.createdAt}
      />
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
    meta: {
      title: LISTING_TABLE_COLUMN_NAMES.updatedAt,
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.updatedAt}
      />
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
];

export function getColumns(
  onEdit: (id: string) => void,
): ColumnDef<ListingData>[] {
  return [
    ...baseListingColumns,
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
