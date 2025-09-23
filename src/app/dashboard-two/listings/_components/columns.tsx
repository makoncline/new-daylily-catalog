"use client";

import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { normalizeForSearch } from "@/lib/table-utils";
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
import type { ListingRow, AhsRow } from "./types";
import { fromDbStatus } from "./status";

type ListingData = ListingRow;
type TableRow = Row<ListingData>;

const getStringValue = <K extends keyof ListingData>(
  row: TableRow,
  key: K,
): string | null => {
  const value = row.original[key];
  return typeof value === "string" ? value : null;
};

// Typed AHS field keys
const AHS_KEYS = [
  "name",
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
] as const satisfies ReadonlyArray<keyof AhsRow>;

// Strongly-typed titles for AHS columns (no casting)
const AHS_COLUMN_TITLES: Record<(typeof AHS_KEYS)[number], string> = {
  name: "Daylily Name",
  hybridizer: LISTING_TABLE_COLUMN_NAMES.hybridizer,
  year: LISTING_TABLE_COLUMN_NAMES.year,
  scapeHeight: LISTING_TABLE_COLUMN_NAMES.scapeHeight,
  bloomSize: LISTING_TABLE_COLUMN_NAMES.bloomSize,
  bloomSeason: LISTING_TABLE_COLUMN_NAMES.bloomSeason,
  ploidy: LISTING_TABLE_COLUMN_NAMES.ploidy,
  foliageType: LISTING_TABLE_COLUMN_NAMES.foliageType,
  color: LISTING_TABLE_COLUMN_NAMES.color,
  form: LISTING_TABLE_COLUMN_NAMES.form,
  fragrance: LISTING_TABLE_COLUMN_NAMES.fragrance,
  budcount: LISTING_TABLE_COLUMN_NAMES.budcount,
  branches: LISTING_TABLE_COLUMN_NAMES.branches,
};

export const baseListingColumns: ColumnDef<ListingData>[] = [
  {
    id: "title",
    accessorKey: "title",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.title },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.title}
        enableFilter
      />
    ),
    cell: ({ row }) => (
      <div data-column="title">
        <TooltipCell content={getStringValue(row, "title")} lines={3} />
      </div>
    ),
    filterFn: fuzzyFilter,
    sortingFn: "fuzzySort",
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "images",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.images },
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
      const images = row.original.images; // minimal shape: { id, url }
      const ahsImageUrl = row.original.ahsListing?.ahsImageUrl;
      if (!images?.length && !ahsImageUrl) return null;
      return (
        <div data-column="images">
          <TableImagePreview
            images={images}
            ahsImageUrl={ahsImageUrl ?? null}
          />
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "price",
    accessorKey: "price",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.price },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.price}
        enableFilter
      />
    ),
    cell: ({ row }) => {
      const price = row.original.price;
      if (typeof price !== "number") return "-";
      return (
        <div data-column="price">
          <TooltipCell content={formatPrice(price)} />
        </div>
      );
    },
    filterFn: (row, _id, filterValue: string) => {
      if (!filterValue) return true;
      const trimmedFilter = filterValue.trim();
      if (!trimmedFilter) return true;
      const price = row.original.price;
      if (typeof price !== "number") return false;
      return (
        price.toString().includes(trimmedFilter) ||
        formatPrice(price).includes(trimmedFilter)
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "description",
    accessorKey: "description",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.description },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.description}
        enableFilter
      />
    ),
    cell: ({ row }) => (
      <div data-column="description">
        <TooltipCell content={getStringValue(row, "description")} lines={3} />
      </div>
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
    meta: { title: LISTING_TABLE_COLUMN_NAMES.lists },
    accessorFn: (row) =>
      row.lists?.length ? row.lists.map((l) => l.title).join(", ") : "",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.lists}
        enableFilter
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
    filterFn: (row, id, filterValue: string | string[]) => {
      // Always read lists from the row's original data (or accessor if provided)
      const lists = row.original.lists ?? row.getValue(id) ?? [];

      // Handle faceted filter (array of selected list IDs)
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        const ids = lists.map((l) => l.id);
        return filterValue.some((selectedId) => ids.includes(selectedId));
      }

      // Handle column filter (string for substring search)
      if (!filterValue) return true;

      const q = normalizeForSearch(filterValue);
      return lists.some((l) => normalizeForSearch(l.title).includes(q));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "status",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.status },
    accessorFn: (row) => row.status,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.status}
      />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      if (!status) return null;
      const uiStatus = fromDbStatus(status);
      const displayText = uiStatus === "hidden" ? "Hidden" : "Published";
      return (
        <div data-column="status">
          <Badge variant="secondary" className="text-xs font-normal">
            {displayText}
          </Badge>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  // AHS columns
  {
    id: "summary",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.summary },
    accessorFn: (row) => formatAhsListingSummary(row.ahsListing),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.summary}
        enableFilter
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue<string | null>("summary");
      return (
        <div data-column="summary">
          <TooltipCell content={value ?? null} lines={3} />
        </div>
      );
    },
    filterFn: fuzzyFilter,
    enableSorting: true,
    enableHiding: true,
  },
  ...AHS_KEYS.map(
    (key): ColumnDef<ListingData> => ({
      id: key,
      meta: { title: AHS_COLUMN_TITLES[key] },
      accessorFn: (row) => {
        const ahsListing = row.ahsListing;
        return ahsListing ? ahsListing[key] : null;
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={AHS_COLUMN_TITLES[key]}
          enableFilter
        />
      ),
      cell: ({ row }) => {
        const ahsListing = row.original.ahsListing;
        const value = ahsListing ? ahsListing[key] : null;
        return (
          <div data-column={key}>
            <TooltipCell
              content={value}
              lines={key === "color" ? 3 : undefined}
            />
          </div>
        );
      },
      filterFn: fuzzyFilter,
      enableSorting: true,
      enableHiding: true,
    }),
  ),
  // Metadata
  {
    id: "createdAt",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.createdAt },
    accessorFn: (row) =>
      row.createdAt ? new Date(row.createdAt).getTime() : null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.createdAt}
      />
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
    sortDescFirst: true,
  },
  {
    id: "updatedAt",
    meta: { title: LISTING_TABLE_COLUMN_NAMES.updatedAt },
    accessorFn: (row) =>
      row.updatedAt ? new Date(row.updatedAt).getTime() : null,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={LISTING_TABLE_COLUMN_NAMES.updatedAt}
      />
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
    sortDescFirst: true,
  },
];

export function getColumns(
  onEdit: (id: string) => void,
  onDelete: (id: string) => Promise<void>,
): ColumnDef<ListingData>[] {
  return [
    ...baseListingColumns,
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsTwo row={row} onEdit={onEdit} onDelete={onDelete} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
