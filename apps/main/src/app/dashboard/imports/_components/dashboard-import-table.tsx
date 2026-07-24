"use client";

import { useId, useMemo, useState } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { OptimizedImage } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCultivarImage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 50;

export type DashboardImportTableView =
  | "all"
  | "duplicates"
  | "excluded"
  | "ready"
  | "review";

interface DashboardImportTableProps {
  controller: CatalogImporterWorkbenchController;
  existingDuplicateCounts: ReadonlyMap<string, number>;
  onRowSelectionChange?: (rowId: string, selected: boolean) => void;
  onRowsSelectionChange?: (rowIds: string[], selected: boolean) => void;
  rowIds?: ReadonlySet<string>;
  selectedRowIds?: ReadonlySet<string>;
  view: DashboardImportTableView;
}

function matchesView(
  row: CatalogImportRow,
  view: DashboardImportTableView,
  existingDuplicateCount: number,
) {
  switch (view) {
    case "duplicates":
      return row.duplicateOfSourceRow !== null || existingDuplicateCount > 0;
    case "excluded":
      return row.outputState === "removed";
    case "ready":
      return row.outputState === "included" && row.priceWarning === null;
    case "review":
      return row.outputState === "included" && row.linkState === "pending";
    default:
      return true;
  }
}

export function DashboardImportTable({
  controller,
  existingDuplicateCounts,
  onRowSelectionChange,
  onRowsSelectionChange,
  rowIds,
  selectedRowIds,
  view,
}: DashboardImportTableProps) {
  const tableId = useId();
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      (controller.matchedRows ?? []).filter(
        (row) =>
          row.rowKind === "listing" &&
          (rowIds
            ? rowIds.has(row.id)
            : matchesView(row, view, existingDuplicateCounts.get(row.id) ?? 0)),
      ),
    [controller.matchedRows, existingDuplicateCounts, rowIds, view],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );
  const allVisibleRowsIncluded =
    visibleRows.length > 0 &&
    visibleRows.every((row) =>
      selectedRowIds
        ? selectedRowIds.has(row.id)
        : row.outputState === "included",
    );
  const showImage = rows.some((row) => getCultivarImage(row.match) !== null);
  const showCultivar = rows.some(
    (row) =>
      !row.match ||
      row.linkState !== "linked" ||
      row.match.displayName !== row.title,
  );
  const showPrice = rows.some(
    (row) => row.price !== null || row.priceWarning !== null,
  );
  const showDescription = rows.some((row) => row.description.trim().length > 0);
  const showPrivateNote = rows.some((row) => row.privateNote.trim().length > 0);
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() =>
      document.getElementById(tableId)?.scrollIntoView?.({ block: "start" }),
    );
  };
  const columns = useMemo(() => {
    const nextColumns: ColumnDef<CatalogImportRow, unknown>[] = [
      {
        id: "include",
        header: "Include",
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;
          const selected = selectedRowIds
            ? selectedRowIds.has(currentRow.id)
            : currentRow.outputState === "included";
          return (
            <Checkbox
              checked={selected}
              aria-label={`Include ${currentRow.title}`}
              onCheckedChange={(checked) => {
                const nextSelected = checked === true;
                if (onRowSelectionChange) {
                  onRowSelectionChange(currentRow.id, nextSelected);
                  return;
                }
                controller.setImportRowIncluded(currentRow.id, nextSelected);
              }}
            />
          );
        },
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;
          const existingDuplicateCount =
            existingDuplicateCounts.get(currentRow.id) ?? 0;
          const selected = selectedRowIds
            ? selectedRowIds.has(currentRow.id)
            : currentRow.outputState === "included";

          return (
            <div className={selected ? "min-w-0" : "min-w-0 opacity-55"}>
              <span
                className="line-clamp-2 font-medium whitespace-normal"
                title={currentRow.title}
              >
                {currentRow.title}
              </span>
              <span className="text-muted-foreground mt-1 block font-mono text-xs">
                Row {currentRow.sourceRow}
              </span>
              {currentRow.duplicateOfSourceRow !== null ? (
                <span className="text-muted-foreground mt-1 block text-xs">
                  Also linked on row {currentRow.duplicateOfSourceRow}
                </span>
              ) : null}
              {existingDuplicateCount > 0 ? (
                <span className="text-muted-foreground mt-1 block text-xs">
                  {existingDuplicateCount} existing listing
                  {existingDuplicateCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          );
        },
      },
    ];

    if (showImage) {
      nextColumns.push({
        id: "image",
        header: "Image",
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;
          const image = getCultivarImage(currentRow.match);

          return image ? (
            <OptimizedImage
              image={image}
              alt={`${currentRow.match?.displayName ?? currentRow.title} reference photo`}
              className="size-12 rounded-md border"
              variant="thumb"
            />
          ) : null;
        },
      });
    }

    if (showCultivar) {
      nextColumns.push({
        id: "cultivar",
        header: "Cultivar",
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;

          return currentRow.match ? (
            <span
              className="line-clamp-2 whitespace-normal"
              title={currentRow.match.displayName}
            >
              {currentRow.match.displayName}
            </span>
          ) : currentRow.linkState === "intentionally-unmatched" ? (
            <span className="text-muted-foreground">Unlinked</span>
          ) : (
            <span className="text-muted-foreground">Needs review</span>
          );
        },
      });
    }

    if (showPrice) {
      nextColumns.push({
        id: "price",
        header: "Price",
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;

          return (
            <span className="tabular-nums">
              {currentRow.priceWarning ? (
                <span className="text-destructive">Review</span>
              ) : currentRow.price === null ? (
                "—"
              ) : (
                formatPrice(currentRow.price)
              )}
            </span>
          );
        },
      });
    }

    if (showDescription) {
      nextColumns.push({
        id: "description",
        header: "Description",
        cell: ({ row: tableRow }) => (
          <span
            className="line-clamp-3 whitespace-normal"
            title={tableRow.original.description}
          >
            {tableRow.original.description || "—"}
          </span>
        ),
      });
    }

    if (showPrivateNote) {
      nextColumns.push({
        id: "privateNote",
        header: "Private note",
        cell: ({ row: tableRow }) => (
          <span
            className="line-clamp-3 whitespace-normal"
            title={tableRow.original.privateNote}
          >
            {tableRow.original.privateNote || "—"}
          </span>
        ),
      });
    }

    return nextColumns;
  }, [
    controller,
    existingDuplicateCounts,
    onRowSelectionChange,
    selectedRowIds,
    showCultivar,
    showDescription,
    showImage,
    showPrice,
    showPrivateNote,
  ]);

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<CatalogImportRow>(),
    columns,
    data: visibleRows,
    enableSorting: false,
    getRowId: (currentRow) => currentRow.id,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      },
    },
    meta: {
      pinnedColumns: {
        left: ["include", "name"],
      },
    },
  });

  return (
    <div id={tableId} className="scroll-mt-4 space-y-3">
      <div className="max-h-[42rem] overflow-y-auto">
        <DataTable table={table} />
      </div>

      {pageCount > 1 || !allVisibleRowsIncluded ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}
            </span>
            {!allVisibleRowsIncluded ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={visibleRows.length === 0}
                title="Include all rows shown on this page"
                onClick={() => {
                  const visibleRowIds = visibleRows.map((row) => row.id);
                  if (onRowsSelectionChange) {
                    onRowsSelectionChange(visibleRowIds, true);
                    return;
                  }
                  controller.setImportRowsIncluded(visibleRowIds, true);
                }}
              >
                Include all
              </Button>
            ) : null}
          </div>
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => changePage(Math.max(0, currentPage - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground tabular-nums">
                {currentPage + 1} of {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= pageCount - 1}
                onClick={() =>
                  changePage(Math.min(pageCount - 1, currentPage + 1))
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
