import type { StorefrontImage } from "@/types/storefront";

export function getOrderedStorefrontImages(
  images: readonly StorefrontImage[],
): StorefrontImage[] {
  return [...images].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
}

export function getFirstStorefrontImage(
  images: readonly StorefrontImage[],
): StorefrontImage | undefined {
  return getOrderedStorefrontImages(images).at(0);
}

export function getStorefrontThumbnailUrl(image: StorefrontImage): string {
  return image.thumbUrl ?? image.url;
}
