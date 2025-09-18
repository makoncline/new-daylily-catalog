"use client";

import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { RowActionsTwo } from "./row-actions-two";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { formatPrice, formatAhsListingSummary } from "@/lib/utils";
import { type Row, type ColumnDef } from "@tanstack/react-table";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import React from "react";
import { fuzzyFilter } from "@/lib/table-utils";
import type { TwoListingRow } from "./listings-provider";

type ListingData = TwoListingRow;
type ListingRow = Row<ListingData>;

const getStringValue = (row: ListingRow, key: keyof ListingData): string | null => {
  const value = row.getValue(key as string);
  return typeof value === "string" ? value : null;
};

export const baseListingColumns: ColumnDef<ListingData>[] = [
  {
    id: "title",
    accessorKey: "title",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.title },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.title} enableFilter />
    ),
    cell: ({ row }) => (
      <TooltipCell content={getStringValue(row, "title")} lines={3} />
    ),
    filterFn: fuzzyFilter,
    sortingFn: "fuzzySort",
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "images",
    accessorKey: "images",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.images },
    accessorFn: (row) => (row.images?.length ?? 0) + (row.ahsListing?.ahsImageUrl ? 1 : 0),
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
      const images = row.original.images as any; // minimal shape: { id, url }
      const ahsImageUrl = row.original.ahsListing?.ahsImageUrl;
      if (!images?.length && !ahsImageUrl) return null;
      return <TableImagePreview images={images} ahsImageUrl={ahsImageUrl ?? null} />;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "price",
    accessorKey: "price",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.price },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.price} />
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
    meta: { title: LISTING_TABLE_COLUMN_NAMES.description },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.description} enableFilter />
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
    meta: { title: LISTING_TABLE_COLUMN_NAMES.privateNote },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.privateNote} enableFilter />
    ),
    cell: ({ row }) => <TooltipCell content={getStringValue(row, "privateNote")} />,
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "lists",
    accessorKey: "lists",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.lists },
    accessorFn: (row) => (row.lists?.length ? row.lists.map((l) => l.title).join(", ") : ""),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.lists} />
    ),
    cell: ({ row }) => {
      const lists = row.original.lists;
      if (!lists || lists.length === 0) return null;
      return (
        <div className="flex items-center gap-2">
          {lists.map((list) => (
            <TruncatedListBadge key={list.id} name={list.title} className="shrink-0 text-xs font-normal" />
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
  {
    id: "status",
    accessorKey: "status",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.status },
    accessorFn: (row) => row.status,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.status} />
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
  // AHS columns
  {
    id: "summary",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.summary },
    accessorFn: (row) => formatAhsListingSummary(row.ahsListing as any),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.summary} enableFilter />
    ),
    cell: ({ row }) => {
      const value: string | null = row.getValue("summary");
      return <TooltipCell content={value} lines={3} />;
    },
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  ...[
    "hybridizer",
    "year",
    "scapeHeight",
    "bloomSize",
    "bloomSeason",
    "ploidy",
    "foliageType",
    "color",
    "form",
    "fragrance",
    "budcount",
    "branches",
  ].map((key) => ({
    id: key,
    accessorKey: `ahsListing.${key}`,
    meta: { title: (LISTING_TABLE_COLUMN_NAMES as any)[key] },
    accessorFn: (row: ListingData) => (row.ahsListing as any)?.[key] ?? null,
    header: ({ column }: any) => (
      <DataTableColumnHeader column={column} title={(LISTING_TABLE_COLUMN_NAMES as any)[key]} />
    ),
    cell: ({ row }: any) => {
      const value = (row.original.ahsListing as any)?.[key] ?? null;
      return <TooltipCell content={value} lines={key === "color" ? 3 : undefined} />;
    },
    enableSorting: true,
    enableHiding: true,
  })) as ColumnDef<ListingData>[],
  // Metadata
  {
    id: "createdAt",
    accessorKey: "createdAt",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.createdAt },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.createdAt} />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt;
      const d = typeof date === "string" ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) return "-";
      const formatted = d.toLocaleDateString(undefined, {
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
    meta: { title: LISTING_TABLE_COLUMN_NAMES.updatedAt },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={LISTING_TABLE_COLUMN_NAMES.updatedAt} />
    ),
    cell: ({ row }) => {
      const date = row.original.updatedAt;
      const d = typeof date === "string" ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) return "-";
      const formatted = d.toLocaleDateString(undefined, {
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

export function getColumns(onEdit: (id: string) => void, onDelete: (id: string) => Promise<void>): ColumnDef<ListingData>[] {
  return [
    ...baseListingColumns,
    {
      id: "actions",
      cell: ({ row }) => <RowActionsTwo row={row as any} onEdit={onEdit} onDelete={onDelete} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
