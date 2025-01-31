import { IMAGE_CONFIG } from "@/components/optimized-image";
import { env } from "@/env";

// Helper function for metadata image optimization

export const getOptimizedMetaImageUrl = (src: string) => {
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

  return `${env.NEXT_PUBLIC_CLOUDFLARE_URL}/cdn-cgi/image/${paramsString}/${src}`;
};
