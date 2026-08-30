export const PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER =
  "Cloudflare-CDN-Cache-Control";
export const PUBLIC_CLOUDFLARE_CACHE_CONTROL =
  "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400";
export const PUBLIC_CLOUDFLARE_CACHE_TAG = "daylily-storefront-public-html";
export const PUBLIC_CLOUDFLARE_ERROR_STATUS_TTL = {
  from: 400,
  to: 599,
  mode: "no-store",
  value: -1,
} as const;
