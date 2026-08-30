import Image from "next/image";

import { getStorefrontThumbnailUrl } from "@/lib/storefront-images";
import type { StorefrontImage } from "@/types/storefront";

export function StorefrontBlurBackdrop({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <span
      className="absolute inset-0 scale-105 bg-cover bg-center blur-md"
      style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
      aria-hidden="true"
    />
  );
}

export function StorefrontImageView({
  image,
  alt,
  sizes,
  priority = false,
  thumbnail = false,
  className = "object-cover",
}: {
  image: StorefrontImage;
  alt: string;
  sizes: string;
  priority?: boolean;
  thumbnail?: boolean;
  className?: string;
}) {
  const src = thumbnail ? getStorefrontThumbnailUrl(image) : image.url;

  return (
    <>
      <StorefrontBlurBackdrop url={image.blurUrl} />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        unoptimized={!src.startsWith("/")}
      />
    </>
  );
}
