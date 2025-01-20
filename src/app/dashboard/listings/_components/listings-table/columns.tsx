"use client";

import {
  DataTableColumnHeader,
  TooltipCell,
  DataTableRowActions,
} from "@/components/data-table";
import { ImagePreviewTooltip } from "@/components/data-table/image-preview-tooltip";
import { COLUMN_NAMES } from "@/config/constants";
import { formatPrice } from "@/lib/utils";
import { type Row, type ColumnDef } from "@tanstack/react-table";
import { TruncatedListBadge } from "@/components/data-table/truncated-list-badge";
import { Image } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type RouterOutputs } from "@/trpc/react";

type ListingData = RouterOutputs["listing"]["list"][number];
type ListingRow = Row<ListingData>;

/**
 * Helper function to safely get string values from a row
 * Returns null if the value is not a string
 */
const getStringValue = (row: ListingRow, key: string): string | null => {
  const value = row.getValue(key);
  return typeof value === "string" ? value : null;
};

export function getColumns(
  onEdit: (id: string) => void,
): ColumnDef<ListingData>[] {
  return [
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
      id: "images",
      accessorKey: "images",
      accessorFn: (row) =>
        (row.images?.length ?? 0) + (row.ahsListing?.ahsImageUrl ? 1 : 0),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center">
                    <Image
                      className="h-4 w-4 text-muted-foreground"
                      aria-label="Sort by images"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Sort by images</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />
      ),
      cell: ({ row }) => {
        const images = row.original.images;
        const ahsImageUrl = row.original.ahsListing?.ahsImageUrl;
        if (!images?.length && !ahsImageUrl) return null;
        return (
          <ImagePreviewTooltip images={images} ahsImageUrl={ahsImageUrl} />
        );
      },
      enableSorting: true,
      enableHiding: true,
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
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.publicNote}
        />
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
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.privateNote}
        />
      ),
      cell: ({ row }) => (
        <TooltipCell content={getStringValue(row, "privateNote")} />
      ),
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "lists",
      accessorKey: "lists",
      header: "Lists",
      cell: ({ row }) => {
        const lists = row.original.lists;
        if (!lists || lists.length === 0) return null;

        return (
          <div className="flex items-center gap-2">
            {lists.map((list) => (
              <TruncatedListBadge
                key={list.id}
                name={list.name}
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

    // AHS Listing columns
    {
      id: "hybridizer",
      accessorKey: "ahsListing.hybridizer",
      accessorFn: (row) => row.ahsListing?.hybridizer ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.hybridizer}
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
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.scapeHeight}
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
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.bloomSeason}
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
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.foliageType}
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
      accessorFn: (row) => row.ahsListing?.bloomHabit ?? null,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={COLUMN_NAMES.bloomHabit}
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
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
