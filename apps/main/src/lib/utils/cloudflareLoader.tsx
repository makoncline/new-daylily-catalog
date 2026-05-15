import { IMAGES } from "@/lib/constants/images";

const IMAGE_TRANSFORM_CONFIG = {
  SIZES: {
    FULL: 800,
  },
  QUALITY: {
    HIGH: 90,
  },
  FIT: "cover" as const,
  FORMAT: "auto" as const,
} as const;

const TRUSTED_META_IMAGE_HOSTS = new Set([
  "daylilycatalog.com",
  "www.daylilycatalog.com",
  "daylily-catalog-images.s3.amazonaws.com",
]);

function isTrustedMetaImageUrl(src: string) {
  try {
    const url = new URL(src);

    return (
      TRUSTED_META_IMAGE_HOSTS.has(url.hostname) ||
      url.hostname.endsWith(".daylilycatalog.com") ||
      (url.hostname.endsWith(".amazonaws.com") &&
        url.hostname.includes("daylily-catalog-images"))
    );
  } catch {
    return false;
  }
}

function shouldUseExistingFullImageTransform(src: string) {
  try {
    const url = new URL(src);
    return url.hostname
      .toLowerCase()
      .startsWith("daylily-catalog-images");
  } catch {
    return false;
  }
}

// Helper function for metadata image optimization that handles both public and external images
export const getOptimizedMetaImageUrl = (src: string) => {
  if (src.startsWith("/assets")) {
    return src;
  }

  if (src.startsWith("https://") && shouldUseExistingFullImageTransform(src)) {
    return cloudflareLoader({
      src,
      width: IMAGE_TRANSFORM_CONFIG.SIZES.FULL,
      quality: IMAGE_TRANSFORM_CONFIG.QUALITY.HIGH,
      fit: IMAGE_TRANSFORM_CONFIG.FIT,
    });
  }

  if (src.startsWith("https://") && isTrustedMetaImageUrl(src)) {
    return src;
  }

  // Avoid creating paid Cloudflare transform variants for untrusted external OG
  // sources. Use a stable local image instead of risking broken social previews.
  return IMAGES.DEFAULT_META;
};

export const getCloudflareMetaImageUrl = (src: string) => {
  return cloudflareLoader({
    src,
    width: 1200,
    height: 630,
    quality: 90,
    format: "webp",
    fit: "cover",
  });
};

// Cloudflare image loader following their recommended pattern
export const cloudflareLoader = ({
  src,
  width,
  height,
  quality,
  fit = IMAGE_TRANSFORM_CONFIG.FIT,
  format = IMAGE_TRANSFORM_CONFIG.FORMAT,
}: {
  src: string;
  width: number;
  height?: number;
  quality?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  format?: "auto" | "webp" | "avif" | "json";
}) => {
  const params = [`width=${width}`, `fit=${fit}`, `format=${format}`];
  if (height) {
    params.splice(1, 0, `height=${height}`);
  }
  if (quality) {
    params.push(`quality=${quality}`);
  }

  const paramsString = params.join(",");
  const encodedSrc = encodeURI(src);

  return `${process.env.NEXT_PUBLIC_CLOUDFLARE_URL}/cdn-cgi/image/${paramsString}/${encodedSrc}`;
};
