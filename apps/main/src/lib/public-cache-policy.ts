export const PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER =
  "Cloudflare-CDN-Cache-Control";
export const PUBLIC_CLOUDFLARE_CACHE_CONTROL =
  "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400";

export function getPublicCloudflareCacheHeaders(headers?: HeadersInit) {
  const cacheHeaders = new Headers(headers);
  cacheHeaders.set(
    PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
    PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  );
  return cacheHeaders;
}
