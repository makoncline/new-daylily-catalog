"use client";

import type { CSSProperties } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { badgeVariants } from "@/components/ui/badge";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
} from "@/lib/catalog-importer";
import { cn } from "@/lib/utils";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
  getUploadedImages,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

function header(title: string) {
  return function CatalogImporterColumnHeader({
    column,
  }: HeaderContext<CatalogImportRow, unknown>) {
    return <DataTableColumnHeader column={column} title={title} />;
  };
}

interface GetCatalogImporterResultColumnsOptions {
  mapping: CatalogColumnMapping;
  onOpenReview: (row: CatalogImportRow) => void;
}

export function getCatalogImporterResultColumns({
  mapping,
  onOpenReview,
}: GetCatalogImporterResultColumnsOptions): ColumnDef<CatalogImportRow>[] {
  const columns: ColumnDef<CatalogImportRow>[] = [
    {
      id: "title",
      accessorFn: (row) => row.match?.displayName ?? row.title,
      meta: { title: "Name" },
      header: header("Name"),
      cell: ({ row }) => (
        <div className="max-w-52 whitespace-normal">
          <p className="line-clamp-2 font-medium">
            {row.original.match?.displayName ?? row.original.title}
          </p>
        </div>
      ),
      enableHiding: false,
      enableSorting: true,
      sortingFn: "fuzzySort",
      filterFn: "fuzzy",
    },
    {
      id: "matchConfidence",
      accessorFn: (row) =>
        row.match?.confidence ??
        (row.matchStatus === "pending"
          ? (row.suggestedMatch?.confidence ?? 0)
          : 0),
      meta: { title: "Match" },
      header: header("Match"),
      cell: ({ row }) => {
        const confidence =
          row.original.match?.confidence ??
          (row.original.matchStatus === "pending"
            ? (row.original.suggestedMatch?.confidence ?? 0)
            : 0);
        const boundedConfidence = Math.max(0, Math.min(100, confidence));
        const hue = Math.round(
          boundedConfidence >= 90
            ? 60 + ((boundedConfidence - 90) / 10) * 60
            : (boundedConfidence / 90) * 60,
        );

        return (
          <button
            type="button"
            aria-label={`Review ${confidence}% match for ${row.original.sourceTitle}`}
            title="Open match selection"
            style={{ "--match-hue": hue } as CSSProperties}
            className={cn(
              badgeVariants({ variant: "outline" }),
              "cursor-pointer border-[hsl(var(--match-hue)_58%_42%)] bg-[hsl(var(--match-hue)_72%_93%)] whitespace-nowrap text-[hsl(var(--match-hue)_68%_24%)] hover:bg-[hsl(var(--match-hue)_72%_88%)] dark:bg-[hsl(var(--match-hue)_45%_18%)] dark:text-[hsl(var(--match-hue)_65%_78%)] dark:hover:bg-[hsl(var(--match-hue)_45%_23%)]",
            )}
            onClick={() => onOpenReview(row.original)}
          >
            {confidence}%
          </button>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
  ];

  columns.push(
    {
      id: "image",
      meta: { title: "Image" },
      accessorFn: (row) => row.match?.imageUrl ?? row.imageUrl,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={
            <span className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              <span className="sr-only">Image</span>
            </span>
          }
        />
      ),
      cell: ({ row }) => {
        const cultivarImage = getCultivarImage(row.original.match);
        const uploadedImages = row.original.match
          ? []
          : getUploadedImages(row.original);

        return cultivarImage || uploadedImages.length > 0 ? (
          <TableImagePreview
            images={uploadedImages}
            cultivarReferenceImage={cultivarImage}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "registryDetails",
      meta: { title: "Registry details" },
      accessorFn: (row) => {
        if (!row.match) return "";
        return [
          row.match.displayName,
          getCandidateMeta(row.match),
          ...getCultivarTraitSummary(row.match),
        ]
          .filter(Boolean)
          .join(" · ");
      },
      header: header("Registry details"),
      cell: ({ row }) => {
        const match = row.original.match;
        if (!match) {
          return (
            <span className="text-muted-foreground">No linked cultivar</span>
          );
        }

        const registryDetails = [
          match.displayName,
          getCandidateMeta(match),
          ...getCultivarTraitSummary(match),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <TooltipCell
            content={registryDetails}
            lines={3}
            className="w-72 max-w-72 whitespace-normal"
          />
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
  );

  if (mapping.price !== null) {
    columns.push({
      id: "price",
      accessorKey: "price",
      meta: { title: "Price" },
      header: header("Price"),
      cell: ({ row }) => (
        <div className="tabular-nums">
          {row.original.price === null
            ? (row.original.priceWarning ?? "—")
            : row.original.price.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
        </div>
      ),
      enableSorting: true,
      enableHiding: true,
    });
  }

  if (mapping.description !== null) {
    columns.push({
      id: "description",
      accessorKey: "description",
      meta: { title: "Description" },
      header: header("Description"),
      cell: ({ row }) => (
        <TooltipCell content={row.original.description || null} lines={3} />
      ),
      enableSorting: true,
      enableHiding: true,
    });
  }

  if (mapping.privateNote !== null) {
    columns.push({
      id: "privateNote",
      accessorKey: "privateNote",
      meta: { title: "Private note" },
      header: header("Private note"),
      cell: ({ row }) => (
        <TooltipCell content={row.original.privateNote || null} lines={2} />
      ),
      enableSorting: true,
      enableHiding: true,
    });
  }

  columns.push({
    id: "sourceRow",
    accessorKey: "sourceRow",
    meta: { title: "Source row" },
    header: header("Source row"),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.sourceRow}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  });

  return columns;
}
