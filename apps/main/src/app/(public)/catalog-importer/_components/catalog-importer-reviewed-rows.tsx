"use client";

import { useMemo } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { CatalogImporterCultivarSummary } from "@/app/(public)/catalog-importer/_components/catalog-importer-cultivar-summary";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface ReviewedRowsTableProps {
  heading: string;
  rows: CatalogImportRow[];
  showMatch?: boolean;
  onReset: (rowId: string) => void;
}

function ReviewedRowsTable({
  heading,
  rows,
  showMatch = false,
  onReset,
}: ReviewedRowsTableProps) {
  const columns = useMemo<ColumnDef<CatalogImportRow>[]>(
    () => [
      {
        accessorKey: "sourceRow",
        header: "Row",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.sourceRow}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => row.sourceTitle,
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.sourceTitle}</span>
        ),
      },
      ...(showMatch
        ? [
            {
              id: "match",
              accessorFn: (row: CatalogImportRow) =>
                row.match?.displayName ?? "",
              header: "Linked cultivar",
              cell: ({ row }: { row: { original: CatalogImportRow } }) =>
                row.original.match ? (
                  <CatalogImporterCultivarSummary
                    candidate={row.original.match}
                  />
                ) : (
                  "—"
                ),
            } satisfies ColumnDef<CatalogImportRow>,
          ]
        : []),
      {
        id: "reset",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Reset review for ${row.original.sourceTitle}`}
            onClick={() => onReset(row.original.id)}
          >
            <Undo2 aria-hidden="true" className="size-4" />
            Reset
          </Button>
        ),
      },
    ],
    [onReset, showMatch],
  );

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<CatalogImportRow>(),
    columns,
    data: rows,
    enableSorting: false,
    getRowId: (row) => row.id,
    state: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.max(rows.length, 1),
      },
    },
    meta: {
      pinnedColumns: {
        left: ["sourceRow", "name"],
        right: ["reset"],
      },
    },
  });

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">
        {heading}{" "}
        <span className="text-muted-foreground tabular-nums">
          {rows.length.toLocaleString()}
        </span>
      </h3>
      <DataTable density={showMatch ? "default" : "compact"} table={table} />
    </section>
  );
}

interface CatalogImporterReviewedRowsProps {
  controller: CatalogImporterWorkbenchController;
}

export function CatalogImporterReviewedRows({
  controller,
}: CatalogImporterReviewedRowsProps) {
  const reviewedRows = (controller.matchedRows ?? [])
    .filter((row) => row.identityReviewed)
    .sort((left, right) => left.sourceRow - right.sourceRow);
  const linkedRows = reviewedRows.filter(
    (row) =>
      row.outputState === "included" && row.linkState === "linked" && row.match,
  );
  const unmatchedRows = reviewedRows.filter(
    (row) =>
      row.outputState === "included" &&
      row.linkState === "intentionally-unmatched",
  );
  const excludedRows = reviewedRows.filter(
    (row) => row.outputState === "removed",
  );

  if (reviewedRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {linkedRows.length > 0 ? (
        <ReviewedRowsTable
          heading="Reviewed linked"
          rows={linkedRows}
          showMatch
          onReset={controller.resetReviewedRow}
        />
      ) : null}
      {unmatchedRows.length > 0 ? (
        <ReviewedRowsTable
          heading="Reviewed without link"
          rows={unmatchedRows}
          onReset={controller.resetReviewedRow}
        />
      ) : null}
      {excludedRows.length > 0 ? (
        <ReviewedRowsTable
          heading="Reviewed excluded"
          rows={excludedRows}
          onReset={controller.resetReviewedRow}
        />
      ) : null}
    </div>
  );
}
