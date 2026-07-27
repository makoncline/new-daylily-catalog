"use client";

import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { TooltipCell } from "@/components/data-table/tooltip-cell";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import { cn } from "@/lib/utils";

export function CatalogImporterCultivarSummary({
  candidate,
  className,
}: {
  candidate: CultivarMatchCandidate;
  className?: string;
}) {
  const image = getCultivarImage(candidate);
  const candidateMeta = getCandidateMeta(candidate);
  const candidateHeading = candidateMeta
    ? `${candidate.displayName} — ${candidateMeta}`
    : candidate.displayName;
  const registryDescription =
    getCultivarTraitSummary(candidate).join(" · ") ||
    "Registry description unavailable";

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3",
        className,
      )}
      data-slot="catalog-importer-cultivar-summary"
    >
      {image ? (
        <TableImagePreview
          images={[]}
          cultivarReferenceImage={image}
          imageAlt={`${candidate.displayName} reference photo`}
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-md border text-center text-xs">
          No photo
        </div>
      )}

      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <p
          className="truncate text-sm font-semibold sm:text-base"
          title={candidateHeading}
        >
          {candidate.displayName}
          {candidateMeta ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {candidateMeta}
            </span>
          ) : null}
        </p>
        <TooltipCell
          content={registryDescription}
          lines={2}
          className="text-muted-foreground mt-0.5 w-full text-xs leading-snug whitespace-normal sm:text-sm"
        />
      </div>
    </div>
  );
}
