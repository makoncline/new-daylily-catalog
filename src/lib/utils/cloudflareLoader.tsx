import { IMAGE_CONFIG } from "@/components/optimized-image";

// Helper function for metadata image optimization that handles both public and external images
export const getOptimizedMetaImageUrl = (src: string) => {
  // If the image is from our public folder (starts with /assets), return as is
  if (src.startsWith("/assets")) {
    return src;
  }

  // Otherwise, optimize through Cloudflare
  return cloudflareLoader({
    src,
    width: 1200,
    quality: 90,
    format: "webp",
    fit: "cover",
  });
};

// Cloudflare image loader following their recommended pattern
export const cloudflareLoader = ({
  src,
  width,
  quality,
  fit = IMAGE_CONFIG.FIT,
  format = IMAGE_CONFIG.FORMAT,
}: {
  src: string;
  width: number;
  quality?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  format?: "auto" | "webp" | "avif" | "json";
}) => {
  const params = [`width=${width}`, `fit=${fit}`, `format=${format}`];
  if (quality) {
    params.push(`quality=${quality}`);
  }

  const paramsString = params.join(",");
  const encodedSrc = encodeURI(src);

  return `${process.env.NEXT_PUBLIC_CLOUDFLARE_URL}/cdn-cgi/image/${paramsString}/${encodedSrc}`;
};
