"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Pencil,
  Trash2,
  Unlink,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogInlineField } from "@/components/catalog-builder/catalog-inline-field";
import { CatalogListSelect } from "@/components/catalog-builder/catalog-list-select";
import { createPublicCatalogSearchColumns } from "@/components/public-catalog-search/public-catalog-search-columns";
import { buildPublicCatalogSearchColumnNames } from "@/components/public-catalog-search/public-catalog-search-registry";
import { matchesTextContains } from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import { getCultivarImage } from "@/lib/catalog-presentation";
import { formatPrice } from "@/lib/utils";
import type { TempListing, TempPreviewRow } from "../_lib/temp-list";

export const tempListColumnNames: Record<string, string> = {
  ...buildPublicCatalogSearchColumnNames(),
  title: "Name",
  price: "Price",
  color: "Cultivar description",
  images: "Images",
  privateNote: "Private notes",
  actions: "Actions",
};
export const tempListVisibleColumns = [
  "select",
  "images",
  "title",
  "description",
  "price",
  "privateNote",
  "lists",
  "color",
  "actions",
];

export function getTempListColumns(
  onUpdate: (listing: TempListing) => void,
  onRemove: (id: string) => void,
  lists: string[],
  onEdit: ((listing: TempListing) => void) | undefined,
): ColumnDef<TempPreviewRow>[] {
  const columns: ColumnDef<TempPreviewRow>[] =
    createPublicCatalogSearchColumns<TempPreviewRow>().map((column) => ({
      ...column,
      header: ({ column: tableColumn }) => (
        <DataTableColumnHeader
          column={tableColumn}
          title={tempListColumnNames[tableColumn.id] ?? tableColumn.id}
          enableFilter={
            tableColumn.id === "title" || tableColumn.id === "description"
          }
        />
      ),
      cell: ({ getValue, row }) => {
        const value = getValue();
        const listing = row.original.listing;
        if (column.id === "lists")
          return (
            <CatalogListSelect
              options={lists}
              values={listing.lists ?? []}
              label={`Lists for ${listing.name}`}
              onChange={(values) => onUpdate({ ...listing, lists: values })}
            />
          );
        if (
          column.id === "title" ||
          column.id === "description" ||
          column.id === "price"
        ) {
          const key = column.id === "title" ? "name" : column.id;
          return (
            <div className="flex flex-col">
              <CatalogInlineField
                value={
                  typeof value === "string" || typeof value === "number"
                    ? String(value)
                    : ""
                }
                label={`${tempListColumnNames[column.id]} for ${listing.name}`}
                field={column.id}
                onSave={(value) => {
                  if (key === "price")
                    onUpdate({
                      ...listing,
                      price: value.trim() ? Number(value) : null,
                    });
                  else onUpdate({ ...listing, [key]: value });
                }}
              />
              {key === "name" &&
              row.original.match &&
              listing.name !== row.original.match.displayName ? (
                <div className="text-muted-foreground flex w-48 cursor-default items-center gap-1 px-2 text-xs">
                  <span
                    className="min-w-0 truncate"
                    title={row.original.match.displayName}
                  >
                    {row.original.match.displayName}
                  </span>
                  <button
                    type="button"
                    className="hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded py-1 focus-visible:ring-2"
                    aria-label={`Reset name to ${row.original.match.displayName}`}
                    onClick={() =>
                      onUpdate({
                        ...listing,
                        name: row.original.match!.displayName,
                      })
                    }
                  >
                    <RotateCcw className="size-3" aria-hidden="true" />
                    Reset
                  </button>
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <div
            className={
              column.id === "color"
                ? "text-muted-foreground w-72 cursor-default"
                : "max-w-60 cursor-default"
            }
          >
            <TooltipCell
              content={
                value == null
                  ? null
                  : column.id === "price" && typeof value === "number"
                    ? formatPrice(value)
                    : typeof value === "string" || typeof value === "number"
                      ? String(value)
                      : typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : null
              }
              lines={2}
              className="cursor-default text-sm leading-5 whitespace-normal"
            />
          </div>
        );
      },
    }));
  columns.unshift({
    id: "select",
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select page"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) =>
          table.toggleAllPageRowsSelected(Boolean(value))
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.listing.name}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
      />
    ),
  });
  columns.splice(2, 0, {
    id: "images",
    accessorFn: (row) => (getCultivarImage(row.match) ? 1 : 0),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={
          <>
            <ImageIcon className="size-4" aria-hidden="true" />
            <span className="sr-only">Images</span>
          </>
        }
      />
    ),
    cell: ({ row }) => (
      <TableImagePreview
        images={[]}
        cultivarReferenceImage={getCultivarImage(row.original.match)}
        imageAlt={row.original.listing.name}
      />
    ),
  });
  columns.push(
    {
      id: "privateNote",
      accessorFn: (row) => row.listing.privateNote,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Private notes"
          enableFilter
        />
      ),
      cell: ({ row }) => (
        <CatalogInlineField
          value={row.original.listing.privateNote}
          label={`Private notes for ${row.original.listing.name}`}
          field="privateNote"
          onSave={(privateNote) =>
            onUpdate({ ...row.original.listing, privateNote })
          }
        />
      ),
      filterFn: (row, id, value) =>
        matchesTextContains(row.getValue(id), value),
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-muted-foreground flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.original.listing.name}`}
            title="Edit listing"
            disabled={!onEdit}
            onClick={() => onEdit?.(row.original.listing)}
          >
            <Pencil aria-hidden="true" />
          </Button>
          {row.original.listing.cultivarReferenceId ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Unlink cultivar from ${row.original.listing.name}`}
              title="Unlink cultivar"
              onClick={() =>
                onUpdate({ ...row.original.listing, cultivarReferenceId: null })
              }
            >
              <Unlink aria-hidden="true" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${row.original.listing.name}`}
            title="Remove listing"
            onClick={() => onRemove(row.original.listing.id)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  );
  function columnPosition(column: ColumnDef<TempPreviewRow>) {
    if (column.id === "actions") return columns.length;
    const index = tempListVisibleColumns.indexOf(column.id ?? "");
    return index === -1 ? tempListVisibleColumns.length : index;
  }
  return columns.sort((a, b) => columnPosition(a) - columnPosition(b));
}
