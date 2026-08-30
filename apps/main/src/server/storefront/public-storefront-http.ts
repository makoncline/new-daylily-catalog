export const PUBLIC_STOREFRONT_CLOUDFLARE_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800, stale-if-error=86400";
export const PUBLIC_STOREFRONT_BROWSER_CACHE_CONTROL =
  "public, max-age=0, must-revalidate";
export const PUBLIC_STOREFRONT_CACHE_TAG = "daylily-storefront-data";

export interface PublicStorefrontRepresentation {
  body: string;
  byteLength: number;
  etag: string;
}

function toOpaqueTag(etag: string) {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}

function matchesIfNoneMatch(value: string | null, etag: string) {
  if (!value) {
    return false;
  }

  const currentOpaqueTag = toOpaqueTag(etag);
  const candidates = value.match(/\*|(?:W\/)?"[^"]*"/g) ?? [];

  return candidates.some(
    (candidate) =>
      candidate === "*" || toOpaqueTag(candidate) === currentOpaqueTag,
  );
}

function getCacheHeaders(etag: string) {
  return new Headers({
    "Cache-Control": PUBLIC_STOREFRONT_BROWSER_CACHE_CONTROL,
    "Cache-Tag": PUBLIC_STOREFRONT_CACHE_TAG,
    "Cloudflare-CDN-Cache-Control": PUBLIC_STOREFRONT_CLOUDFLARE_CACHE_CONTROL,
    ETag: etag,
  });
}

export function getPublicStorefrontResponse(
  request: Request,
  representation: PublicStorefrontRepresentation,
) {
  const headers = getCacheHeaders(representation.etag);

  if (
    matchesIfNoneMatch(
      request.headers.get("If-None-Match"),
      representation.etag,
    )
  ) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Content-Length", String(representation.byteLength));
  return new Response(representation.body, {
    status: 200,
    headers,
  });
}
