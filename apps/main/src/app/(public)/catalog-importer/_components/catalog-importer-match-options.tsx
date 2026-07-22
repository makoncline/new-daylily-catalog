"use client";

import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { Kbd } from "@/components/ui/kbd";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

export const LEAVE_UNMATCHED_SHORTCUT = "U";
export const EXCLUDE_FROM_CATALOG_SHORTCUT = "X";

export interface CatalogImporterSourceCell {
  column: string;
  label: string;
  mapped?: boolean;
  value: string;
}

function CandidateImage({ candidate }: { candidate: CultivarMatchCandidate }) {
  const image = getCultivarImage(candidate);

  return image ? (
    <TableImagePreview
      images={[]}
      cultivarReferenceImage={image}
      imageAlt={`${candidate.displayName} reference photo`}
    />
  ) : (
    <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-md border text-center text-xs">
      No photo
    </div>
  );
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
  const candidateMeta = getCandidateMeta(candidate);
  const registryDescription =
    getCultivarTraitSummary(candidate).join(" · ") ||
    "Registry description unavailable";
  const suggestionReason =
    candidate.confidence === 100 ? "Exact name match" : null;

  return (
    <article
      role="listitem"
      className="focus-within:bg-muted/50 hover:bg-muted/30 grid min-h-24 cursor-pointer grid-cols-[7.25rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-md p-3 transition-colors motion-reduce:transition-none sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"
      onClick={() => onChoose(candidate)}
    >
      <div
        data-testid="candidate-choice-media"
        className="flex items-center gap-3"
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
        <CandidateImage candidate={candidate} />
      </div>

      <div
        data-testid="candidate-choice-details"
        className="flex min-w-0 flex-col justify-center overflow-hidden"
      >
        <h3 className="line-clamp-2 text-sm font-semibold break-words sm:text-base">
          {candidate.displayName}
          {candidateMeta ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {candidateMeta}
            </span>
          ) : null}
        </h3>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug break-words sm:text-sm">
          {registryDescription}
        </p>
        {suggestionReason ? (
          <p className="text-muted-foreground mt-0.5 text-xs">
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
  const titleCellIndex = sourceCells.findIndex(
    (cell) => cell.value.trim() === row.sourceTitle.trim(),
  );

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label} · Spreadsheet row {row.sourceRow}
      </p>

      <dl
        aria-label={`Uploaded spreadsheet row ${row.sourceRow}`}
        className="divide-y rounded-md border md:hidden"
      >
        {sourceCells.map((cell, cellIndex) => (
          <div
            key={cell.column}
            className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2"
          >
            <dt className="text-muted-foreground text-xs font-medium break-words">
              {cell.label}
            </dt>
            <dd
              className={
                cellIndex === titleCellIndex
                  ? "text-sm font-medium break-words"
                  : "min-w-0 text-sm break-words"
              }
            >
              {cell.value || <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="hidden max-w-full overflow-x-auto rounded-md border md:block">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Uploaded spreadsheet row {row.sourceRow}
          </caption>
          <thead className="bg-muted/60">
            <tr>
              {sourceCells.map((cell) => (
                <th
                  key={cell.column}
                  scope="col"
                  className="min-w-32 border-r border-b px-3 py-2 font-medium whitespace-normal last:border-r-0"
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {sourceCells.map((cell, cellIndex) => (
                <td
                  key={cell.column}
                  className="max-w-80 border-r px-3 py-2 align-top whitespace-normal last:border-r-0"
                >
                  {cellIndex === titleCellIndex ? (
                    <h3 className="text-sm font-medium break-words">
                      {cell.value}
                    </h3>
                  ) : (
                    cell.value || (
                      <span className="text-muted-foreground">—</span>
                    )
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
