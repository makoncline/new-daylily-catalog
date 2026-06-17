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
    return args.image.url;
  }

  return (
    getVariantUrl(asset, args.variant ?? "display") ??
    asset.originalUrl ??
    args.image.url
  );
}

export function resolveLegacyImagesWithAssets<
  TImage extends LegacyImageRow,
>(args: {
  images: readonly TImage[];
  imageAssets?: readonly ImageAssetUrlRow[] | null;
  variant?: ImageAssetVariant;
}) {
  const imageAssetByLegacyId = buildImageAssetMap(args.imageAssets ?? []);

  return args.images.map((image) => ({
    ...image,
    url: resolveImageAssetUrl({
      image,
      imageAssetByLegacyId,
      variant: args.variant,
    }),
  }));
}
