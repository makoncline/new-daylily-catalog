import { fromCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { findCultivarReferenceByNormalizedName } from "@/server/db/public-cultivar-context";
import { resolveCultivarReferenceImage } from "@/server/services/cultivar-reference-image-read-model";

function formatAwards(value: string | null | undefined) {
  if (!value) return null;

  try {
    const awards: unknown = JSON.parse(value);
    if (!Array.isArray(awards)) return null;

    const labels = awards.flatMap((award: unknown) => {
      if (!award || typeof award !== "object" || !("name" in award)) return [];
      const name = award.name;
      if (typeof name !== "string" || !name.trim()) return [];
      const year = "year" in award ? award.year : null;
      return [
        `${name}${typeof year === "number" || typeof year === "string" ? ` ${year}` : ""}`,
      ];
    });

    return labels.length ? labels.join(", ") : null;
  } catch {
    return null;
  }
}

export async function getPublicCultivarSocialCardData(segment: string) {
  const normalizedName = fromCultivarRouteSegment(segment);
  if (!normalizedName) return null;

  const reference = await findCultivarReferenceByNormalizedName(normalizedName);
  if (!reference) return null;

  const image = resolveCultivarReferenceImage({
    id: reference.id,
    fallbackImageUrl: reference.ahsListing?.ahsImageUrl,
    imageAssets: reference.imageAssets,
  });

  return {
    title:
      reference.ahsListing?.name ?? reference.normalizedName ?? normalizedName,
    ahsListing: reference.ahsListing,
    extraDetails: {
      flowerShow: reference.v2AhsCultivar?.flower_show ?? null,
      rebloom:
        reference.v2AhsCultivar?.rebloom == null
          ? null
          : reference.v2AhsCultivar.rebloom === 1
            ? "Yes"
            : "No",
      awards: formatAwards(reference.v2AhsCultivar?.awards_json),
    },
    imageUrls: image ? [image.url] : [],
  };
}
