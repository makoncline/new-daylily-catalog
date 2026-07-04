import type { Prisma } from "@prisma/client";
import {
  type AhsDisplayListing,
  mapV2AhsCultivarToDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import {
  ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
  type ExampleCultivar,
} from "./anonymous-onboarding-config";
import {
  areImageAssetsEnabled,
  orderedImageAssetUrlInclude,
} from "@/server/services/image-asset-read-model";

const onboardingAhsListingSelect = {
  id: true,
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  color: true,
  form: true,
  parentage: true,
  fragrance: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
} as const satisfies Prisma.AhsListingSelect;

export const onboardingCultivarReferenceSelect = {
  id: true,
  ahsListing: {
    select: onboardingAhsListingSelect,
  },
  v2AhsCultivar: {
    select: v2AhsCultivarDisplaySelect,
  },
  imageAssets: orderedImageAssetUrlInclude,
} as const satisfies Prisma.CultivarReferenceSelect;

export type OnboardingCultivarReferenceRow =
  Prisma.CultivarReferenceGetPayload<{
    select: typeof onboardingCultivarReferenceSelect;
  }>;

function getOnboardingDisplayAhsListing(row: OnboardingCultivarReferenceRow) {
  const legacyAhsListing: AhsDisplayListing | null = row.ahsListing;

  return (
    (row.v2AhsCultivar
      ? mapV2AhsCultivarToDisplayAhsListing(row.v2AhsCultivar)
      : null) ??
    legacyAhsListing
  );
}

function getOnboardingImageAssetUrl(row: OnboardingCultivarReferenceRow) {
  if (!areImageAssetsEnabled()) return null;

  const asset = row.imageAssets[0];
  const displayUrl = asset?.displayUrl?.trim();
  if (displayUrl) return displayUrl;

  const originalUrl = asset?.originalUrl?.trim();
  if (originalUrl) return originalUrl;

  return null;
}

export function buildOnboardingExampleCultivars(
  rows: OnboardingCultivarReferenceRow[],
  cultivarReferenceIds: readonly string[] = ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
): ExampleCultivar[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return cultivarReferenceIds.flatMap((cultivarReferenceId) => {
    const row = rowsById.get(cultivarReferenceId);
    const ahsListing = row ? getOnboardingDisplayAhsListing(row) : null;
    const name = ahsListing?.name?.trim();
    const hybridizerYear = [ahsListing?.hybridizer, ahsListing?.year]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(", ");
    const imageUrl =
      (row ? getOnboardingImageAssetUrl(row) : null) ??
      ahsListing?.ahsImageUrl?.trim();

    if (!row || !name || !hybridizerYear || !imageUrl) {
      return [];
    }

    return [
      {
        key: row.id,
        name,
        hybridizerYear,
        imageUrl,
      },
    ];
  });
}
