import type { OptimizedImageSource } from "@/components/optimized-image";
import type { AhsDisplayListing } from "@/lib/utils/ahs-display";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";

export function getCultivarImage(
  candidate: CultivarMatchCandidate | null,
): OptimizedImageSource | null {
  if (!candidate?.imageUrl) {
    return null;
  }

  return {
    id: candidate.imageAsset?.id ?? candidate.cultivarReferenceId,
    imageAsset: candidate.imageAsset,
    url: candidate.imageUrl,
  };
}

function formatInches(value: number | null) {
  return value === null ? null : `${value}"`;
}

function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

export function getCandidateAhsDisplayListing(
  candidate: CultivarMatchCandidate,
): AhsDisplayListing {
  return {
    id: candidate.cultivarReferenceId,
    name: candidate.displayName,
    ahsImageUrl: null,
    hybridizer: candidate.hybridizer,
    year: candidate.year === null ? null : String(candidate.year),
    scapeHeight: formatInches(candidate.scapeHeightIn),
    bloomSize: formatInches(candidate.bloomSizeIn),
    bloomSeason: candidate.bloomSeason,
    ploidy: candidate.ploidy,
    foliageType: candidate.foliageType ?? null,
    bloomHabit: candidate.bloomHabit ?? (candidate.rebloom ? "Reblooms" : null),
    color: candidate.color,
    form: candidate.form,
    parentage: candidate.parentage ?? null,
    fragrance: candidate.fragrance ?? null,
    budcount: formatCount(candidate.budCount),
    branches: formatCount(candidate.branches),
    sculpting: candidate.sculptedTypes ?? null,
    foliage: null,
    flower: null,
  };
}

export function getCandidateMeta(candidate: CultivarMatchCandidate) {
  return [candidate.hybridizer, candidate.year]
    .filter((value) => value !== null && value !== "")
    .join(" · ");
}

export function getCultivarTraitSummary(candidate: CultivarMatchCandidate) {
  return [
    candidate.color,
    candidate.bloomSizeIn ? `${candidate.bloomSizeIn}\" bloom` : null,
    candidate.scapeHeightIn ? `${candidate.scapeHeightIn}\" scape` : null,
    candidate.form,
    candidate.ploidy,
    candidate.bloomSeason,
    candidate.rebloom ? "Reblooms" : null,
  ].filter((value): value is string => Boolean(value));
}
