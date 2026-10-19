import type { Prisma } from "@prisma/client";
import {
  type AhsDisplayListing,
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import type { db } from "@/server/db";
import {
  generatedCultivarImageAssetInclude,
  resolveCultivarReferenceImage,
} from "@/server/services/cultivar-reference-image-read-model";

export const cultivarReferenceSelect = {
  id: true,
  ahsId: true,
  v2AhsCultivarId: true,
  normalizedName: true,
  updatedAt: true,
  v2AhsCultivar: { select: v2AhsCultivarDisplaySelect },
  imageAssets: generatedCultivarImageAssetInclude,
} as const satisfies Prisma.CultivarReferenceSelect;

type CultivarReference = Prisma.CultivarReferenceGetPayload<{
  select: typeof cultivarReferenceSelect;
}>;

export async function getPublicCultivarReference(args: {
  database: typeof db;
  cultivarReferenceId?: string;
  normalizedName?: string;
}) {
  return args.database.cultivarReference.findFirst({
    where: args.cultivarReferenceId
      ? { id: args.cultivarReferenceId }
      : { normalizedName: args.normalizedName },
    select: cultivarReferenceSelect,
  });
}

export function serializeCultivarDisplay(
  ahsListing: AhsDisplayListing | null,
  imageUrl?: string | null,
) {
  if (!ahsListing) return null;

  return {
    name: ahsListing.name,
    hybridizer: ahsListing.hybridizer,
    year: ahsListing.year,
    scapeHeight: ahsListing.scapeHeight,
    bloomSize: ahsListing.bloomSize,
    bloomSeason: ahsListing.bloomSeason,
    ploidy: ahsListing.ploidy,
    foliageType: ahsListing.foliageType,
    bloomHabit: ahsListing.bloomHabit,
    color: ahsListing.color,
    form: ahsListing.form,
    parentage: ahsListing.parentage,
    imageUrl: imageUrl ?? null,
  };
}

export function serializeCultivarReference(
  cultivarReference: CultivarReference | null,
  baseUrl: string,
) {
  if (!cultivarReference) return null;
  const ahsListing = getDisplayAhsListing(cultivarReference);
  const cultivarReferenceImage = resolveCultivarReferenceImage({
    id: `ahs-${cultivarReference.id}`,
    fallbackImageUrl: ahsListing?.ahsImageUrl,
    imageAssets: cultivarReference.imageAssets,
  });
  const segment = cultivarReference.normalizedName
    ? toCultivarRouteSegment(cultivarReference.normalizedName)
    : null;

  return {
    id: cultivarReference.id,
    ahsId: cultivarReference.ahsId,
    v2AhsCultivarId: cultivarReference.v2AhsCultivarId,
    normalizedName: cultivarReference.normalizedName,
    canonicalUrl: segment ? `${baseUrl}/cultivar/${segment}` : null,
    updatedAt: cultivarReference.updatedAt.toISOString(),
    display: serializeCultivarDisplay(
      ahsListing,
      cultivarReferenceImage?.url ?? null,
    ),
  };
}
