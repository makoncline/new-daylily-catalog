"use client";

import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { Button } from "@/components/ui/button";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

export interface CatalogImporterSourceCell {
  column: string;
  label: string;
  value: string;
}

function CandidateImage({ candidate }: { candidate: CultivarMatchCandidate }) {
  const image = getCultivarImage(candidate);

  return image ? (
    <TableImagePreview images={[]} cultivarReferenceImage={image} />
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
    candidate.confidence === 100
      ? "Exact normalized-name match"
      : `Suggested because the names are ${candidate.confidence}% similar`;

  return (
    <article
      role="listitem"
      className="focus-within:border-primary hover:border-foreground/30 grid h-40 grid-cols-[7.25rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-md border p-3 transition-colors sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4 sm:p-4"
    >
      <div
        data-testid="candidate-choice-media"
        className="flex items-center gap-3"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 text-base font-semibold tabular-nums"
          aria-label={`Use match ${choiceNumber}: ${candidate.displayName}`}
          onClick={() => onChoose(candidate)}
        >
          {choiceNumber}
        </Button>
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
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed break-words sm:text-sm">
          {registryDescription}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{suggestionReason}</p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto w-fit max-w-full justify-start p-0 text-xs"
          onClick={() => onChoose(candidate)}
        >
          <span className="truncate">
            Link this listing to {candidate.displayName}
          </span>
        </Button>
      </div>
    </article>
  );
}

export function CatalogImporterCandidateList({
  ariaLabel,
  candidates,
  onChoose,
  startIndex = 0,
}: {
  ariaLabel: string;
  candidates: CultivarMatchCandidate[];
  onChoose: (candidate: CultivarMatchCandidate) => void;
  startIndex?: number;
}) {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      className="max-h-[31.5rem] space-y-3 overflow-y-auto overscroll-contain pr-1"
    >
      {candidates.map((candidate, candidateIndex) => (
        <CandidateChoice
          key={candidate.cultivarReferenceId}
          candidate={candidate}
          choiceNumber={startIndex + candidateIndex + 1}
          onChoose={onChoose}
        />
      ))}
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
  return (
    <div className="space-y-2">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label} · Source row {row.sourceRow}
        </p>
        <h3 className="mt-1 text-xl font-semibold break-words">
          {row.sourceTitle}
        </h3>
      </div>

      <div className="max-w-full overflow-x-auto rounded-md border">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Uploaded spreadsheet row {row.sourceRow}
          </caption>
          <thead className="bg-muted/60">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground sticky left-0 z-10 border-r border-b bg-inherit px-3 py-2 font-mono text-xs font-normal"
              >
                Row
              </th>
              {sourceCells.map((cell) => (
                <th
                  key={cell.column}
                  scope="col"
                  className="min-w-32 border-r border-b px-3 py-2 align-bottom font-medium whitespace-normal last:border-r-0"
                >
                  <span className="text-muted-foreground block font-mono text-[0.6875rem] font-normal">
                    {cell.column}
                  </span>
                  {cell.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                scope="row"
                className="text-muted-foreground bg-background sticky left-0 z-10 border-r px-3 py-3 font-mono text-xs font-normal"
              >
                {row.sourceRow}
              </th>
              {sourceCells.map((cell) => (
                <td
                  key={cell.column}
                  className="max-w-80 border-r px-3 py-3 align-top whitespace-normal last:border-r-0"
                >
                  {cell.value || (
                    <span className="text-muted-foreground">—</span>
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
