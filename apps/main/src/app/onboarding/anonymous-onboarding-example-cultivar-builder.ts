import type { Prisma } from "@prisma/client";
import {
  ahsDisplayAhsListingSelect,
  getDisplayAhsListing,
  mapV2AhsCultivarToDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import {
  ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
  type ExampleCultivar,
} from "./anonymous-onboarding-config";

export const onboardingCultivarReferenceSelect = {
  id: true,
  ahsListing: {
    select: ahsDisplayAhsListingSelect,
  },
  v2AhsCultivar: {
    select: v2AhsCultivarDisplaySelect,
  },
} as const satisfies Prisma.CultivarReferenceSelect;

export type OnboardingCultivarReferenceRow =
  Prisma.CultivarReferenceGetPayload<{
    select: typeof onboardingCultivarReferenceSelect;
  }>;

function getOnboardingDisplayAhsListing(row: OnboardingCultivarReferenceRow) {
  return (
    getDisplayAhsListing(row) ??
    (row.v2AhsCultivar
      ? mapV2AhsCultivarToDisplayAhsListing(row.v2AhsCultivar)
      : null) ??
    row.ahsListing
  );
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
    const imageUrl = ahsListing?.ahsImageUrl?.trim();

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
