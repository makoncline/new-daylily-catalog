"use client";

import { useMemo, useRef, useState } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { ArrowUp } from "lucide-react";
import { CatalogImporterCultivarSummary } from "@/app/(public)/catalog-importer/_components/catalog-importer-cultivar-summary";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  prepareCatalogImportListing,
  type CatalogImportRow,
} from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { formatPrice } from "@/lib/utils";

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
  selectionLimit: number;
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
  selectionLimit,
  selectedRowIds,
  view,
}: DashboardImportTableProps) {
  const [visibleCount, setVisibleCount] = useState(selectionLimit);
  const [showReturnToTop, setShowReturnToTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );
  const remainingRowCount = Math.max(0, rows.length - visibleRows.length);
  const nextLoadCount = Math.min(selectionLimit, remainingRowCount);
  const selectedVisibleRowCount = visibleRows.filter((row) =>
    selectedRowIds
      ? selectedRowIds.has(row.id)
      : row.outputState === "included",
  ).length;
  const allVisibleRowsIncluded =
    visibleRows.length > 0 &&
    selectedVisibleRowCount ===
      (selectedRowIds
        ? Math.min(selectionLimit, visibleRows.length)
        : visibleRows.length);
  const someVisibleRowsIncluded = selectedVisibleRowCount > 0;
  const columns = useMemo(() => {
    const nextColumns: ColumnDef<CatalogImportRow, unknown>[] = [
      {
        id: "include",
        header: () => (
          <Checkbox
            checked={
              allVisibleRowsIncluded
                ? true
                : someVisibleRowsIncluded
                  ? "indeterminate"
                  : false
            }
            aria-label={`Select up to ${selectionLimit.toLocaleString()} visible listings`}
            onCheckedChange={(checked) => {
              const visibleRowIds = visibleRows.map((row) => row.id);
              if (onRowsSelectionChange) {
                onRowsSelectionChange(visibleRowIds, checked === true);
                return;
              }
              controller.setImportRowsIncluded(visibleRowIds, checked === true);
            }}
          />
        ),
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;
          const importName = prepareCatalogImportListing(currentRow).title;
          const selected = selectedRowIds
            ? selectedRowIds.has(currentRow.id)
            : currentRow.outputState === "included";
          const selectionLimitReached =
            selectedRowIds !== undefined &&
            !selected &&
            selectedRowIds.size >= selectionLimit;
          return (
            <Checkbox
              checked={selected}
              disabled={selectionLimitReached}
              aria-label={`Include ${importName}`}
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
          const importName = prepareCatalogImportListing(currentRow).title;
          const existingDuplicateCount =
            existingDuplicateCounts.get(currentRow.id) ?? 0;
          const selected = selectedRowIds
            ? selectedRowIds.has(currentRow.id)
            : currentRow.outputState === "included";

          return (
            <div className={selected ? "min-w-0" : "min-w-0 opacity-55"}>
              <span
                className="line-clamp-2 font-medium whitespace-normal"
                title={importName}
              >
                {importName}
              </span>
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
      {
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
      },
      {
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
      },
      {
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
      },
      {
        id: "cultivar",
        header: "Linked cultivar",
        cell: ({ row: tableRow }) =>
          tableRow.original.match ? (
            <CatalogImporterCultivarSummary
              candidate={tableRow.original.match}
              className="w-max max-w-96"
            />
          ) : (
            <span className="text-muted-foreground">Not linked</span>
          ),
      },
    ];

    return nextColumns;
  }, [
    controller,
    allVisibleRowsIncluded,
    existingDuplicateCounts,
    onRowSelectionChange,
    onRowsSelectionChange,
    selectionLimit,
    selectedRowIds,
    someVisibleRowsIncluded,
    visibleRows,
  ]);

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<CatalogImportRow>(),
    columns,
    data: visibleRows,
    enableSorting: false,
    getRowId: (currentRow) => currentRow.id,
    manualPagination: true,
    meta: {
      pinnedColumns: {
        left: ["include", "name"],
      },
    },
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={scrollAreaRef}
          className="max-h-[60vh] overflow-y-auto lg:max-h-[42rem]"
          data-slot="dashboard-import-scroll-area"
          onScroll={(event) => {
            const shouldShow = event.currentTarget.scrollTop > 32;
            if (shouldShow !== showReturnToTop) {
              setShowReturnToTop(shouldShow);
            }
          }}
        >
          <DataTable table={table} />
          {remainingRowCount > 0 ? (
            <div className="flex justify-center py-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setVisibleCount((current) =>
                    Math.min(rows.length, current + selectionLimit),
                  )
                }
              >
                Show {nextLoadCount.toLocaleString()} more
              </Button>
            </div>
          ) : null}
        </div>
        {visibleRows.length > 8 && showReturnToTop ? (
          <div className="absolute right-3 bottom-3 z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTop = 0;
                }
                setShowReturnToTop(false);
              }}
            >
              <ArrowUp />
              Return to top
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
