"use client";

import { useMemo } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { DataTable } from "@/components/data-table";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { cn } from "@/lib/utils";

type ExcludedRowKind = "issues" | "review";

interface SourceCell {
  column: string;
  label: string;
  mapped?: boolean;
  value: string;
}

interface ExcludedSourceRow {
  issueColumns: ReadonlySet<string>;
  reason: string;
  row: CatalogImportRow;
  sourceCells: SourceCell[];
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

function getNameCellIndex(cells: SourceCell[], row: CatalogImportRow) {
  const mappedNameCellIndex = cells.findIndex(
    (cell) => cell.mapped && normalizeLabel(cell.label) === "name",
  );

  return mappedNameCellIndex >= 0
    ? mappedNameCellIndex
    : cells.findIndex((cell) => cell.value.trim() === row.sourceTitle.trim());
}

function getIssueDetails(
  kind: ExcludedRowKind,
  row: CatalogImportRow,
  cells: SourceCell[],
) {
  const issueColumns = new Set<string>();
  const reasons: string[] = [];
  const nameCellIndex = getNameCellIndex(cells, row);
  const addMappedColumn = (label: string) => {
    const cell = cells.find(
      (sourceCell) =>
        sourceCell.mapped && normalizeLabel(sourceCell.label) === label,
    );
    if (cell) issueColumns.add(cell.column);
  };

  if (kind === "review") {
    if (nameCellIndex >= 0) {
      issueColumns.add(cells[nameCellIndex]!.column);
    }
    reasons.push("Cultivar match needs review");
  }

  if (row.priceWarning !== null) {
    addMappedColumn("price");
    reasons.push("Price needs review");
  }

  if (row.cultivarReferenceIdWarning !== null) {
    const idCell = cells.find((cell) => {
      const label = normalizeLabel(cell.label);
      return (
        cell.mapped &&
        (label === "daylily catalog id" || label === "cultivar reference id")
      );
    });
    if (idCell) {
      issueColumns.add(idCell.column);
    } else if (nameCellIndex >= 0) {
      issueColumns.add(cells[nameCellIndex]!.column);
    }
    reasons.push("Daylily Catalog ID needs review");
  }

  if (row.duplicateOfSourceRow !== null && !row.duplicateAccepted) {
    if (nameCellIndex >= 0) {
      issueColumns.add(cells[nameCellIndex]!.column);
    }
    reasons.push(`Possible duplicate of row ${row.duplicateOfSourceRow}`);
  }

  return {
    issueColumns,
    reason: reasons.join(" · "),
  };
}

export function DashboardImportExcludedRows({
  controller,
  kind,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  kind: ExcludedRowKind;
  rows: CatalogImportRow[];
}) {
  const data = useMemo<ExcludedSourceRow[]>(
    () =>
      rows.map((row) => {
        const sourceCells = controller.getSourceCellsForRow(row);
        return {
          ...getIssueDetails(kind, row, sourceCells),
          row,
          sourceCells,
        };
      }),
    [controller, kind, rows],
  );
  const sourceColumns = useMemo(() => data[0]?.sourceCells ?? [], [data]);
  const nameCellIndex =
    data.length > 0 ? getNameCellIndex(sourceColumns, data[0]!.row) : -1;
  const columns = useMemo<ColumnDef<ExcludedSourceRow, unknown>[]>(
    () => [
      {
        id: "row",
        header: "Row",
        cell: ({ row: tableRow }) => (
          <span className="text-muted-foreground font-mono">
            {tableRow.original.row.sourceRow}
          </span>
        ),
      },
      ...sourceColumns.map(
        (sourceColumn, columnIndex): ColumnDef<ExcludedSourceRow, unknown> => ({
          id: `column-${sourceColumn.column}`,
          header: sourceColumn.label,
          accessorFn: (sourceRow) =>
            sourceRow.sourceCells[columnIndex]?.value ?? "",
          cell: ({ getValue, row: tableRow }) => {
            const highlighted = tableRow.original.issueColumns.has(
              sourceColumn.column,
            );

            return (
              <span
                data-issue-highlight={highlighted ? "true" : undefined}
                className={cn(
                  "line-clamp-2 w-full whitespace-normal",
                  columnIndex ===
                    getNameCellIndex(
                      tableRow.original.sourceCells,
                      tableRow.original.row,
                    ) && "font-medium",
                  highlighted &&
                    "bg-amber-100 px-1.5 py-1 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
                )}
              >
                {String(getValue()) || (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            );
          },
        }),
      ),
      {
        id: "reason",
        header: "Why excluded",
        cell: ({ row: tableRow }) => (
          <span className="line-clamp-2 min-w-48 whitespace-normal">
            {tableRow.original.reason}
          </span>
        ),
      },
    ],
    [sourceColumns],
  );
  const pinnedColumns = useMemo(
    () => ({
      left: [
        "row",
        ...(nameCellIndex >= 0
          ? [`column-${sourceColumns[nameCellIndex]!.column}`]
          : []),
      ],
    }),
    [nameCellIndex, sourceColumns],
  );

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<ExcludedSourceRow>(),
    columns,
    data,
    enableSorting: false,
    meta: { pinnedColumns },
  });

  if (rows.length === 0) return null;

  const review = kind === "review";
  const heading =
    rows.length === 1
      ? review
        ? "1 listing has not been reviewed"
        : "1 listing has an unresolved issue"
      : review
        ? `${rows.length.toLocaleString()} listings have not been reviewed`
        : `${rows.length.toLocaleString()} listings have unresolved issues`;

  return (
    <section className="space-y-3" aria-label={heading}>
      <div>
        <h3 className="font-medium">{heading}</h3>
        <p className="text-muted-foreground text-sm">
          Highlighted values need attention. These listings will not be
          imported.
        </p>
      </div>
      <div className="max-h-[32rem] max-w-full min-w-0 overflow-y-auto">
        <DataTable density="compact" table={table} />
      </div>
    </section>
  );
}
