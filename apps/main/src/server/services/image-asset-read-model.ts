import { reportError } from "@/lib/error-utils";

export interface LegacyImageRow {
  id: string;
  url: string;
}

export interface ImageAssetUrlRow {
  id: string;
  legacyImageId: string | null;
  originalUrl: string | null;
  displayUrl: string | null;
  thumbUrl: string | null;
  blurUrl: string | null;
}

export type ImageAssetVariant = "display" | "thumb" | "blur";

function areImageAssetsEnabled() {
  return process.env.USE_IMAGE_ASSETS === "true";
}

function getVariantUrl(asset: ImageAssetUrlRow, variant: ImageAssetVariant) {
  if (variant === "thumb") return asset.thumbUrl;
  if (variant === "blur") return asset.blurUrl;
  return asset.displayUrl;
}

export function buildImageAssetMap(assets: readonly ImageAssetUrlRow[]) {
  const map = new Map<string, ImageAssetUrlRow>();

  for (const asset of assets) {
    map.set(asset.id, asset);

    if (asset.legacyImageId) {
      map.set(asset.legacyImageId, asset);
    }
  }

  return map;
}

export function resolveImageAssetUrl(args: {
  image: LegacyImageRow;
  imageAssetByLegacyId: ReadonlyMap<string, ImageAssetUrlRow>;
  variant?: ImageAssetVariant;
  source: string;
}) {
  if (!areImageAssetsEnabled()) {
    return args.image.url;
  }

  const variant = args.variant ?? "display";
  const asset = args.imageAssetByLegacyId.get(args.image.id);

  if (!asset) {
    reportError({
      error: new Error("ImageAsset row missing for legacy image"),
      level: "warning",
      context: {
        source: args.source,
        imageId: args.image.id,
        requestedVariant: variant,
      },
    });

    return args.image.url;
  }

  const variantUrl = getVariantUrl(asset, variant);
  if (variantUrl) {
    return variantUrl;
  }

  if (asset.originalUrl) {
    reportError({
      error: new Error("ImageAsset variant missing; using original fallback"),
      level: "warning",
      context: {
        source: args.source,
        imageId: args.image.id,
        imageAssetId: asset.id,
        requestedVariant: variant,
      },
    });

    return asset.originalUrl;
  }

  reportError({
    error: new Error("ImageAsset has no usable URL; using legacy fallback"),
    level: "warning",
    context: {
      source: args.source,
      imageId: args.image.id,
      imageAssetId: asset.id,
      requestedVariant: variant,
    },
  });

  return args.image.url;
}

export function resolveLegacyImagesWithAssets<
  TImage extends LegacyImageRow,
>(args: {
  images: readonly TImage[];
  imageAssets?: readonly ImageAssetUrlRow[] | null;
  variant?: ImageAssetVariant;
  source: string;
}) {
  const imageAssetByLegacyId = buildImageAssetMap(args.imageAssets ?? []);

  return args.images.map((image) => ({
    ...image,
    url: resolveImageAssetUrl({
      image,
      imageAssetByLegacyId,
      variant: args.variant,
      source: args.source,
    }),
  }));
}
