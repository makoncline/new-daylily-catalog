"use client";

import {
  DataTableColumnHeader,
  TooltipCell,
  DataTableRowActions,
} from "@/components/data-table";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { formatPrice, formatAhsListingSummary } from "@/lib/utils";
import { type Row, type ColumnDef } from "@tanstack/react-table";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { fuzzyFilter } from "@/lib/table-utils";
import { getCultivarListingColumns } from "./listing-cultivar-columns";
import {
  type ListingData,
  textContainsFilter,
  numericRangeFilter,
  priceToggleFilter,
  hasPhotoFilter,
  booleanToggleFilter,
} from "./listing-table-model";

export type { ListingData } from "./listing-table-model";

type ListingRow = Row<ListingData>;

const getStringValue = (row: ListingRow, key: string): string | null => {
  const value = row.getValue(key);
  return typeof value === "string" ? value : null;
};

function getBaseListingColumns(): ColumnDef<ListingData>[] {
  return [
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
        (row.images?.length ?? 0) + (row.cultivarReferenceImage ? 1 : 0),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={
            <span className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              <span className="sr-only">
                {LISTING_TABLE_COLUMN_NAMES.images}
              </span>
            </span>
          }
        />
      ),
      cell: ({ row }) => {
        const images = row.original.images;
        const cultivarReferenceImage = row.original.cultivarReferenceImage;
        if (!images?.length && !cultivarReferenceImage) return null;
        return (
          <TableImagePreview
            images={images}
            cultivarReferenceImage={cultivarReferenceImage}
          />
        );
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
      filterFn: priceToggleFilter,
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
      filterFn: textContainsFilter,
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
      filterFn: textContainsFilter,
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
                className="shrink-0"
              />
            ))}
          </div>
        );
      },
      filterFn: (row, id, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || !filterValue.length) return true;
        return row.original.lists.some((list) => filterValue.includes(list.id));
      },
      enableSorting: true,
      enableHiding: true,
    },
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
          <Badge variant="secondary">{row.original.status}</Badge>
        ) : null,
      enableSorting: true,
      enableHiding: true,
    },

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
    ...getCultivarListingColumns(),

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
}

const dashboardAdvancedFilterColumns: ColumnDef<ListingData>[] = [
  {
    id: "priceValue",
    meta: {
      title: "Price Range",
    },
    accessorFn: (row) => row.price ?? null,
    filterFn: numericRangeFilter,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "cultivarName",
    meta: {
      title: "Cultivar",
    },
    accessorFn: (row) => row.ahsListing?.name ?? row.title ?? null,
    filterFn: textContainsFilter,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "linkedToCultivar",
    meta: {
      title: "Linked to Cultivar",
    },
    accessorFn: (row) => row.cultivarReferenceId !== null,
    filterFn: booleanToggleFilter,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "hasPhoto",
    meta: {
      title: "Has Photo",
    },
    accessorFn: (row) =>
      row.images.length > 0 || Boolean(row.cultivarReferenceImage),
    filterFn: hasPhotoFilter,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "parentage",
    meta: {
      title: "Parentage",
    },
    accessorFn: (row) => row.ahsListing?.parentage ?? null,
    filterFn: textContainsFilter,
    enableSorting: false,
    enableHiding: false,
  },
];

export const baseListingColumns: ColumnDef<ListingData>[] =
  getBaseListingColumns();

export function getColumns(
  onEdit: (id: string) => void,
  publicUserSlug = "",
): ColumnDef<ListingData>[] {
  return [
    ...getBaseListingColumns(),
    ...dashboardAdvancedFilterColumns,
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onEdit={onEdit}
          publicUserSlug={publicUserSlug}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
