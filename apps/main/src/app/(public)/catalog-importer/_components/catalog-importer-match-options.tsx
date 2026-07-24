"use client";

import { useMemo } from "react";
import { type ColumnDef, useReactTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Kbd } from "@/components/ui/kbd";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import { CatalogImporterCultivarSummary } from "@/app/(public)/catalog-importer/_components/catalog-importer-cultivar-summary";
import { defaultTableConfig } from "@/lib/table-config";

export const LEAVE_UNMATCHED_SHORTCUT = "U";
export const EXCLUDE_FROM_CATALOG_SHORTCUT = "X";

export interface CatalogImporterSourceCell {
  column: string;
  label: string;
  mapped?: boolean;
  value: string;
}

function CandidateChoice({
  candidate,
  choiceNumber,
  onChoose,
}: {
  candidate: CultivarMatchCandidate;
  choiceNumber: number;
  onChoose: (candidate: CultivarMatchCandidate) => void;
}) {
  const suggestionReason =
    candidate.confidence === 100 ? "Exact name match" : null;

  return (
    <article
      role="listitem"
      className="focus-within:bg-muted/50 hover:bg-muted/30 grid min-h-24 cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-md p-3 transition-colors motion-reduce:transition-none sm:gap-4"
      onClick={() => onChoose(candidate)}
    >
      <div
        data-testid="candidate-choice-media"
        className="flex items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <Kbd
          asChild
          className="size-10 shrink-0 text-base font-semibold tabular-nums"
        >
          <button
            type="button"
            aria-label={`Use match ${choiceNumber}: ${candidate.displayName}`}
            aria-keyshortcuts={String(choiceNumber)}
            onClick={() => onChoose(candidate)}
          >
            {choiceNumber}
          </button>
        </Kbd>
      </div>

      <div
        data-testid="candidate-choice-details"
        className="flex min-w-0 flex-col gap-0.5 overflow-hidden"
      >
        <CatalogImporterCultivarSummary candidate={candidate} />
        {suggestionReason ? (
          <p className="text-muted-foreground pl-[4.75rem] text-xs">
            {suggestionReason}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function CatalogImporterCandidateList({
  ariaLabel,
  candidates,
  destination = "workbook",
  onExclude,
  onLeaveUnmatched,
  onChoose,
}: {
  ariaLabel: string;
  candidates: CultivarMatchCandidate[];
  destination?: "import" | "workbook";
  onExclude?: () => void;
  onLeaveUnmatched: () => void;
  onChoose: (candidate: CultivarMatchCandidate) => void;
}) {
  return (
    <div role="list" aria-label={ariaLabel} className="flex flex-col gap-1">
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto overscroll-contain">
        {candidates.map((candidate, candidateIndex) => (
          <CandidateChoice
            key={candidate.cultivarReferenceId}
            candidate={candidate}
            choiceNumber={candidateIndex + 1}
            onChoose={onChoose}
          />
        ))}
      </div>
      <div role="listitem" className="flex min-h-11 items-center gap-3 p-3">
        <Kbd asChild className="size-10 shrink-0 text-base font-semibold">
          <button
            type="button"
            aria-label="Leave unmatched"
            aria-keyshortcuts={LEAVE_UNMATCHED_SHORTCUT}
            title={`Keep this row in the ${destination} without a Daylily Catalog cultivar ID or link`}
            onClick={onLeaveUnmatched}
          >
            {LEAVE_UNMATCHED_SHORTCUT}
          </button>
        </Kbd>
        <span className="font-medium">Leave unmatched</span>
        <span className="sr-only">
          Leave unmatched keeps this row in the {destination} without a Daylily
          Catalog cultivar ID or link.
        </span>
      </div>
      {onExclude ? (
        <div role="listitem" className="flex min-h-11 items-center gap-3 p-3">
          <Kbd asChild className="size-10 shrink-0 text-base font-semibold">
            <button
              type="button"
              aria-label="Exclude from catalog"
              aria-keyshortcuts={EXCLUDE_FROM_CATALOG_SHORTCUT}
              title={`Exclude this row from the ${destination}`}
              onClick={onExclude}
            >
              {EXCLUDE_FROM_CATALOG_SHORTCUT}
            </button>
          </Kbd>
          <span className="font-medium">Exclude from catalog</span>
          <span className="sr-only">
            This row will not be included in the {destination}.
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function CatalogImporterSourceRow({
  label = "Your listing",
  row,
  sourceCells,
}: {
  label?: string;
  row: CatalogImportRow;
  sourceCells: CatalogImporterSourceCell[];
}) {
  const mappedNameCellIndex = sourceCells.findIndex(
    (cell) => cell.mapped && cell.label.trim().toLowerCase() === "name",
  );
  const titleCellIndex =
    mappedNameCellIndex >= 0
      ? mappedNameCellIndex
      : sourceCells.findIndex(
          (cell) => cell.value.trim() === row.sourceTitle.trim(),
        );
  const data = useMemo(
    () => [{ cells: sourceCells, rowNumber: row.sourceRow }],
    [row.sourceRow, sourceCells],
  );
  const columns = useMemo<ColumnDef<(typeof data)[number], unknown>[]>(
    () => [
      {
        id: "row",
        header: "Row",
        accessorKey: "rowNumber",
        cell: ({ row: tableRow }) => (
          <span className="text-muted-foreground font-mono font-normal">
            {tableRow.original.rowNumber}
          </span>
        ),
      },
      ...sourceCells.map(
        (cell, cellIndex): ColumnDef<(typeof data)[number], unknown> => ({
          id: `column-${cell.column}`,
          header: cell.label,
          accessorFn: (sourceRow) => sourceRow.cells[cellIndex]?.value ?? "",
          cell: ({ getValue }) => (
            <span
              className={
                cellIndex === titleCellIndex
                  ? "line-clamp-2 font-medium whitespace-normal"
                  : "line-clamp-2 whitespace-normal"
              }
            >
              {String(getValue()) || (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          ),
        }),
      ),
    ],
    [sourceCells, titleCellIndex],
  );
  const pinnedColumns = useMemo(
    () => ({
      left: [
        "row",
        ...(titleCellIndex >= 0
          ? [`column-${sourceCells[titleCellIndex]!.column}`]
          : []),
      ],
    }),
    [sourceCells, titleCellIndex],
  );

  // TanStack Table exposes mutable APIs by design; React Compiler cannot memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<(typeof data)[number]>(),
    columns,
    data,
    enableSorting: false,
    meta: { pinnedColumns },
  });

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label} · Spreadsheet row {row.sourceRow}
      </p>

      <div
        aria-label={`Uploaded spreadsheet row ${row.sourceRow}`}
        className="max-w-full min-w-0"
        role="region"
      >
        <DataTable density="compact" table={table} />
      </div>
    </div>
  );
}
