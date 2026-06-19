import type { Prisma } from "@prisma/client";

export function areImageAssetsEnabled() {
  return process.env.USE_IMAGE_ASSETS === "true";
}

export interface LegacyImageRow {
  id: string;
  url: string;
}

export const imageAssetUrlSelect = {
  id: true,
  legacyImageId: true,
  status: true,
  originalUrl: true,
  displayUrl: true,
  thumbUrl: true,
  blurUrl: true,
} as const;

export type ImageAssetUrlRow = Prisma.ImageAssetGetPayload<{
  select: typeof imageAssetUrlSelect;
}>;

export const orderedImageAssetUrlInclude = {
  select: imageAssetUrlSelect,
  orderBy: { order: "asc" },
} as const;

export type ImageAssetVariant = "display" | "thumb" | "blur";

export interface ImageAssetView {
  id: string;
  status: string | null;
  originalUrl: string | null;
  displayUrl: string | null;
  thumbUrl: string | null;
  blurUrl: string | null;
}

const reportedFallbacks = new Set<string>();

function getVariantUrl(asset: ImageAssetUrlRow, variant: ImageAssetVariant) {
  if (variant === "thumb") return asset.thumbUrl;
  if (variant === "blur") return asset.blurUrl;
  return asset.displayUrl;
}

export function buildImageAssetMap(assets: readonly ImageAssetUrlRow[]) {
  const map = new Map<string, ImageAssetUrlRow>();

  for (const asset of assets) {
    if (asset.legacyImageId) {
      map.set(asset.legacyImageId, asset);
    }
  }

  return map;
}

export function toImageAssetView(asset: ImageAssetUrlRow): ImageAssetView {
  return {
    id: asset.id,
    status: asset.status,
    originalUrl: asset.originalUrl,
    displayUrl: asset.displayUrl,
    thumbUrl: asset.thumbUrl,
    blurUrl: asset.blurUrl,
  };
}

function logImageAssetFallback(args: {
  reason: "missing_asset" | "missing_variant" | "missing_original";
  imageId: string;
  imageAssetId?: string;
  variant: ImageAssetVariant;
  fallback: "original" | "legacy";
}) {
  const reportKey = [
    args.reason,
    args.imageId,
    args.imageAssetId ?? "none",
    args.variant,
    args.fallback,
  ].join(":");

  if (reportedFallbacks.has(reportKey)) return;
  reportedFallbacks.add(reportKey);

  console.warn(
    JSON.stringify({
      event: "image_asset_fallback",
      ...args,
    }),
  );
}

export function resolveImageAssetUrl(args: {
  image: LegacyImageRow;
  imageAssetByLegacyId: ReadonlyMap<string, ImageAssetUrlRow>;
  variant?: ImageAssetVariant;
}) {
  if (!areImageAssetsEnabled()) {
    return args.image.url;
  }

  const asset = args.imageAssetByLegacyId.get(args.image.id);
  if (!asset) {
    logImageAssetFallback({
      reason: "missing_asset",
      imageId: args.image.id,
      variant: args.variant ?? "display",
      fallback: "legacy",
    });
    return args.image.url;
  }

  const variant = args.variant ?? "display";
  const variantUrl = getVariantUrl(asset, variant);
  if (variantUrl) return variantUrl;

  if (asset.originalUrl) {
    logImageAssetFallback({
      reason: "missing_variant",
      imageId: args.image.id,
      imageAssetId: asset.id,
      variant,
      fallback: "original",
    });
    return asset.originalUrl;
  }

  logImageAssetFallback({
    reason: "missing_original",
    imageId: args.image.id,
    imageAssetId: asset.id,
    variant,
    fallback: "legacy",
  });
  return args.image.url;
}

export function resolveLegacyImagesWithAssets<
  TImage extends LegacyImageRow,
>(args: {
  images: readonly TImage[];
  imageAssets?: readonly ImageAssetUrlRow[] | null;
  variant?: ImageAssetVariant;
}) {
  const imageAssetByLegacyId = buildImageAssetMap(args.imageAssets ?? []);

  return args.images.map((image) => {
    const asset = areImageAssetsEnabled()
      ? imageAssetByLegacyId.get(image.id)
      : undefined;

    return {
      ...image,
      url: resolveImageAssetUrl({
        image,
        imageAssetByLegacyId,
        variant: args.variant,
      }),
      ...(asset ? { imageAsset: toImageAssetView(asset) } : {}),
    };
  });
}
