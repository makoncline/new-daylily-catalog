import { createHash } from "node:crypto";
import type { PublicStorefrontSnapshot } from "@/server/storefront/public-storefront-read-model";

export const PUBLIC_STOREFRONT_CLOUDFLARE_CACHE_CONTROL =
  "public, max-age=86400";
export const PUBLIC_STOREFRONT_BROWSER_CACHE_CONTROL =
  "public, max-age=0, must-revalidate";

function toWeakEtag(body: string) {
  const digest = createHash("sha256").update(body).digest("base64url");
  return `W/"${digest}"`;
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
    "Cloudflare-CDN-Cache-Control": PUBLIC_STOREFRONT_CLOUDFLARE_CACHE_CONTROL,
    ETag: etag,
  });
}

export function getPublicStorefrontResponse(
  request: Request,
  snapshot: PublicStorefrontSnapshot,
) {
  const body = JSON.stringify(snapshot);
  const etag = toWeakEtag(body);
  const headers = getCacheHeaders(etag);

  if (matchesIfNoneMatch(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(body, {
    status: 200,
    headers,
  });
}
