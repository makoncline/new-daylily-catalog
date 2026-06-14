import { IMAGES } from "@/lib/constants/images";

const IMAGE_TRANSFORM_CONFIG = {
  SIZES: {
    THUMBNAIL: 200,
    FULL: 800,
  },
  QUALITY: {
    MEDIUM: 75,
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
const STATIC_IMAGE_ASSET_HOST = "media.daylilycatalog.com";

function isStaticImageAssetUrl(src: string) {
  try {
    return new URL(src).hostname.toLowerCase() === STATIC_IMAGE_ASSET_HOST;
  } catch {
    return false;
  }
}

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

function shouldUseExistingImageTransform(src: string) {
  try {
    const url = new URL(src);
    return url.hostname.toLowerCase().startsWith("daylily-catalog-images");
  } catch {
    return false;
  }
}

function getOriginalCloudflareImageSource(src: string) {
  try {
    const url = new URL(src);
    const marker = "/cdn-cgi/image/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex < 0) {
      return null;
    }

    const transformedPath = url.pathname.slice(markerIndex + marker.length);
    const sourceIndex = transformedPath.indexOf("https://");

    if (sourceIndex < 0) {
      return null;
    }

    return decodeURI(transformedPath.slice(sourceIndex));
  } catch {
    return null;
  }
}

export function getDaylilyS3ImageTransformSource(src: string) {
  const source = getOriginalCloudflareImageSource(src) ?? src;
  return shouldUseExistingImageTransform(source) ? source : null;
}

// Helper function for metadata image optimization that handles both public and external images
export const getOptimizedMetaImageUrl = (src: string) => {
  if (src.startsWith("/assets") || isStaticImageAssetUrl(src)) {
    return src;
  }

  const transformSource = getDaylilyS3ImageTransformSource(src);

  if (src.startsWith("https://") && transformSource) {
    return cloudflareLoader({
      src: transformSource,
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

export const getCloudflareUrlForDaylilyS3Image = (src: string) => {
  const transformSource = getDaylilyS3ImageTransformSource(src);

  if (!transformSource) {
    return src;
  }

  return cloudflareLoader({
    src: transformSource,
    width: IMAGE_TRANSFORM_CONFIG.SIZES.FULL,
    quality: IMAGE_TRANSFORM_CONFIG.QUALITY.HIGH,
    fit: IMAGE_TRANSFORM_CONFIG.FIT,
  });
};

export const getCloudflareUrlForDaylilyS3ImagePath = (path: string) => {
  return getCloudflareUrlForDaylilyS3Image(
    `https://daylily-catalog-images.s3.amazonaws.com/${path}`,
  );
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
