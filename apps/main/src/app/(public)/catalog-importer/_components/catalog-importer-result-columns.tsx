"use client";

import {
  Image as ImageIcon,
  MoreHorizontal,
  TriangleAlert,
} from "lucide-react";
import type { ColumnDef, FilterFn, HeaderContext } from "@tanstack/react-table";
import { DataTableColumnHeader, TooltipCell } from "@/components/data-table";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
} from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
  getMatchStatusLabel,
  getRowIssues,
  getUploadedImages,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

const matchStatusFilter: FilterFn<CatalogImportRow> = (row, id, value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return true;
  }

  return value.includes(row.getValue(id));
};

function header(title: string) {
  return function CatalogImporterColumnHeader({
    column,
  }: HeaderContext<CatalogImportRow, unknown>) {
    return <DataTableColumnHeader column={column} title={title} />;
  };
}

interface GetCatalogImporterResultColumnsOptions {
  mapping: CatalogColumnMapping;
  mode: "pro" | "public";
  onOpenReview: (row: CatalogImportRow) => void;
}

export function getCatalogImporterResultColumns({
  mapping,
  mode,
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
          {row.original.match &&
          row.original.match.displayName !== row.original.title ? (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
              Source: {row.original.title}
            </p>
          ) : null}
        </div>
      ),
      enableHiding: false,
      enableSorting: true,
      sortingFn: "fuzzySort",
      filterFn: "fuzzy",
    },
    {
      id: "matchStatus",
      accessorKey: "matchStatus",
      meta: { title: "Match status" },
      header: header("Match status"),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.matchStatus === "pending" ? "outline" : "secondary"
          }
          className="whitespace-nowrap"
        >
          {getMatchStatusLabel(row.original.matchStatus)}
        </Badge>
      ),
      filterFn: matchStatusFilter,
      enableSorting: true,
      enableHiding: true,
    },
  ];

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

        return (
          <div className="w-72 max-w-72 whitespace-normal">
            <p className="line-clamp-2 font-medium">
              {match.displayName}
              {getCandidateMeta(match) ? ` · ${getCandidateMeta(match)}` : ""}
            </p>
            <TooltipCell
              content={getCultivarTraitSummary(match).join(" · ") || null}
              lines={2}
            />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "issues",
      meta: { title: "Issues" },
      accessorFn: (row) => getRowIssues(row).join(" · "),
      header: header("Issues"),
      cell: ({ row }) => {
        const issues = getRowIssues(row.original);
        if (issues.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TriangleAlert className="size-3" />
              {issues.length}
            </Badge>
            <TooltipCell content={issues.join(" · ")} lines={2} />
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
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
    },
  );

  if (mode === "pro") {
    columns.push({
      id: "actions",
      meta: { title: "Actions" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const needsReview = row.original.matchStatus === "pending";
        if (!needsReview) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                data-review-row-id={row.original.id}
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Review match for ${row.original.title}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Row actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onOpenReview(row.original)}>
                Review cultivar match
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
}
