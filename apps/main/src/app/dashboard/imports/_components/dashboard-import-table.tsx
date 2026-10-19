"use client";

import { useMemo, useRef, useState } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { ArrowUp } from "lucide-react";
import { CatalogImporterCultivarSummary } from "@/app/(public)/catalog-importer/_components/catalog-importer-cultivar-summary";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  prepareCatalogImportListing,
  type CatalogImportRow,
} from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { cn, formatPrice } from "@/lib/utils";

interface DashboardImportTableProps {
  rows: CatalogImportRow[];
  disabled: boolean;
  onRowSelectionChange: (rowId: string, selected: boolean) => void;
  onRowsSelectionChange: (rowIds: string[], selected: boolean) => void;
  selectionLimit: number;
  selectedRowIds: ReadonlySet<string>;
}

export function DashboardImportTable({
  rows,
  disabled,
  onRowSelectionChange,
  onRowsSelectionChange,
  selectionLimit,
  selectedRowIds,
}: DashboardImportTableProps) {
  const [visibleCount, setVisibleCount] = useState(selectionLimit);
  const [showReturnToTop, setShowReturnToTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );
  const remainingRowCount = Math.max(0, rows.length - visibleRows.length);
  const nextLoadCount = Math.min(selectionLimit, remainingRowCount);
  const selectedVisibleRowCount = visibleRows.filter((row) =>
    selectedRowIds.has(row.id),
  ).length;
  const allVisibleRowsIncluded =
    visibleRows.length > 0 &&
    selectedVisibleRowCount === Math.min(selectionLimit, visibleRows.length);
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
            disabled={disabled}
            aria-label={`Select up to ${selectionLimit.toLocaleString()} visible listings`}
            onCheckedChange={(checked) => {
              const visibleRowIds = visibleRows.map((row) => row.id);
              onRowsSelectionChange(visibleRowIds, checked === true);
            }}
          />
        ),
        cell: ({ row: tableRow }) => {
          const currentRow = tableRow.original;
          const importName = prepareCatalogImportListing(currentRow).title;
          const selected = selectedRowIds.has(currentRow.id);
          const selectionLimitReached =
            !selected && selectedRowIds.size >= selectionLimit;
          return (
            <Checkbox
              checked={selected}
              disabled={disabled || selectionLimitReached}
              aria-label={`Include ${importName}`}
              onCheckedChange={(checked) => {
                const nextSelected = checked === true;
                onRowSelectionChange(currentRow.id, nextSelected);
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
          const selected = selectedRowIds.has(currentRow.id);

          return (
            <div className={cn("min-w-0", !selected && "opacity-55")}>
              <span
                className="line-clamp-2 font-medium whitespace-normal"
                title={importName}
              >
                {importName}
              </span>
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
    disabled,
    allVisibleRowsIncluded,
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
    <div className="flex flex-col gap-4">
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
              <ArrowUp data-icon="inline-start" />
              Return to top
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
