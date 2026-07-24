"use client";

import { TableImagePreview } from "@/components/data-table/table-image-preview";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

export function CatalogImporterCultivarSummary({
  candidate,
}: {
  candidate: CultivarMatchCandidate;
}) {
  const image = getCultivarImage(candidate);
  const candidateMeta = getCandidateMeta(candidate);
  const registryDescription =
    getCultivarTraitSummary(candidate).join(" · ") ||
    "Registry description unavailable";

  return (
    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
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
        <p className="line-clamp-2 text-sm font-semibold break-words sm:text-base">
          {candidate.displayName}
          {candidateMeta ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {candidateMeta}
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug break-words sm:text-sm">
          {registryDescription}
        </p>
      </div>
    </div>
  );
}
