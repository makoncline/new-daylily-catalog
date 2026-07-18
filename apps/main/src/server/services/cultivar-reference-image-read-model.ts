import { getCloudflareUrlForDaylilyS3Image } from "@/lib/utils/cloudflareLoader";
import {
  imageAssetUrlSelect,
  type ImageAssetUrlRow,
  type ImageAssetView,
  toImageAssetView,
} from "@/server/services/image-asset-read-model";

export const generatedCultivarImageAssetInclude = {
  where: {
    kind: "cultivar" as const,
    status: "ready" as const,
  },
  select: imageAssetUrlSelect,
  orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
  take: 1,
};

export interface CultivarReferenceImageView {
  id: string;
  url: string;
  imageAsset?: ImageAssetView;
}

function toNonEmptyUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function getGeneratedCultivarImageAssetUrl(
  asset: ImageAssetView | null | undefined,
) {
  if (!asset) return null;

  return asset.displayUrl ?? asset.originalUrl;
}

export function resolveCultivarReferenceImage(args: {
  id: string;
  fallbackImageUrl?: string | null;
  imageAssets?: readonly ImageAssetUrlRow[] | null;
}): CultivarReferenceImageView | null {
  const generatedAssetRow = args.imageAssets?.[0] ?? null;
  const generatedAsset = generatedAssetRow
    ? toImageAssetView(generatedAssetRow)
    : null;
  const generatedUrl = getGeneratedCultivarImageAssetUrl(generatedAsset);
  const fallbackUrl = toNonEmptyUrl(args.fallbackImageUrl);
  const publicFallbackUrl = fallbackUrl
    ? getCloudflareUrlForDaylilyS3Image(fallbackUrl)
    : null;
  const url = generatedUrl ?? publicFallbackUrl;

  if (!url) {
    return null;
  }

  return {
    id: args.id,
    url,
    ...(generatedAsset ? { imageAsset: generatedAsset } : {}),
  };
}
