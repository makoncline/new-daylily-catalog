"use client";

import { useMemo } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface ResolvedIssueRow {
  actionId: number;
  currentRow: CatalogImportRow | null;
  previousRow: CatalogImportRow;
  resolution: string;
}

function formatPrice(price: number) {
  return `$${Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)}`;
}

function getFallbackResolution(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("excluded")) {
    return "Listing excluded";
  }
  if (normalizedMessage.includes("price")) {
    return "Price updated";
  }
  if (normalizedMessage.includes("kept")) {
    return "Listing kept";
  }
  if (normalizedMessage.includes("id")) {
    return "Cultivar ID reviewed";
  }

  return "Issue resolved";
}

function getResolution({
  currentRow,
  message,
  previousRow,
}: {
  currentRow: CatalogImportRow | null;
  message: string;
  previousRow: CatalogImportRow;
}) {
  if (!currentRow) {
    return getFallbackResolution(message);
  }

  if (
    previousRow.outputState !== "removed" &&
    currentRow.outputState === "removed"
  ) {
    return "Listing excluded";
  }

  if (previousRow.priceWarning !== null && currentRow.priceWarning === null) {
    return currentRow.price === null
      ? "Price removed"
      : `Price updated to ${formatPrice(currentRow.price)}`;
  }

  if (!previousRow.duplicateAccepted && currentRow.duplicateAccepted) {
    return "Listing kept";
  }

  if (
    previousRow.cultivarReferenceIdWarning !== null &&
    currentRow.cultivarReferenceIdWarning === null
  ) {
    return currentRow.linkState === "linked"
      ? "Cultivar ID updated"
      : "Cultivar ID cleared";
  }

  return getFallbackResolution(message);
}

export function CatalogImporterReviewedIssues({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const rows = useMemo(() => {
    const currentRowsById = new Map(
      (controller.matchedRows ?? []).map((row) => [row.id, row]),
    );

    return controller.reviewedIssueActions
      .flatMap((action) =>
        action.previousRows.map((previousRow) => {
          const currentRow = currentRowsById.get(previousRow.id) ?? null;

          return {
            actionId: action.id,
            currentRow,
            previousRow,
            resolution: getResolution({
              currentRow,
              message: action.message,
              previousRow,
            }),
          } satisfies ResolvedIssueRow;
        }),
      )
      .sort(
        (left, right) =>
          left.previousRow.sourceRow - right.previousRow.sourceRow,
      );
  }, [controller.matchedRows, controller.reviewedIssueActions]);

  const columns = useMemo<ColumnDef<ResolvedIssueRow>[]>(
    () => [
      {
        id: "sourceRow",
        accessorFn: (row) => row.previousRow.sourceRow,
        header: "Row",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.previousRow.sourceRow}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => row.previousRow.sourceTitle,
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.previousRow.sourceTitle}
          </span>
        ),
      },
      {
        accessorKey: "resolution",
        header: "Change",
      },
      {
        id: "undo",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Undo issue change for row ${row.original.previousRow.sourceRow}`}
            onClick={() =>
              controller.undoReviewedIssueAction(
                row.original.actionId,
                row.original.previousRow.id,
              )
            }
          >
            <Undo2 aria-hidden="true" data-icon="inline-start" />
            Undo
          </Button>
        ),
      },
    ],
    [controller],
  );

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<ResolvedIssueRow>(),
    columns,
    data: rows,
    enableSorting: false,
    getRowId: (row) => `${row.actionId}:${row.previousRow.id}`,
    state: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.max(rows.length, 1),
      },
    },
    meta: {
      pinnedColumns: {
        left: ["sourceRow", "name"],
        right: ["undo"],
      },
    },
  });

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="catalog-importer-reviewed-issues-heading"
      className="flex flex-col gap-2"
    >
      <h3
        id="catalog-importer-reviewed-issues-heading"
        className="text-sm font-medium"
      >
        Resolved issues{" "}
        <span className="text-muted-foreground tabular-nums">
          {rows.length.toLocaleString()}
        </span>
      </h3>
      <DataTable density="compact" table={table} />
    </section>
  );
}
