import { Buffer } from "node:buffer";
import { createHash, timingSafeEqual } from "node:crypto";

interface StorefrontArtifactRefreshResult {
  generatedAt: string;
  sellers: Array<{ id: string }>;
}

export interface StorefrontArtifactRefreshHandlerDependencies {
  getToken: () => string | undefined;
  refresh: () => Promise<StorefrontArtifactRefreshResult>;
}

const refreshRouteOrigin = "http://127.0.0.1:3000";
const refreshRoutePath = "/api/internal/storefront-artifacts/refresh";

function privateJson(body: unknown, status: number, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");

  return Response.json(body, { status, headers: responseHeaders });
}

export function isCanonicalStorefrontRefreshToken(
  value: unknown,
): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    return false;
  }

  const bytes = Buffer.from(value, "base64url");
  return bytes.byteLength >= 32 && bytes.toString("base64url") === value;
}

function getBearerToken(authorization: string | null) {
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/iu);
  return match?.[1];
}

function tokenMatches(providedToken: string, expectedToken: string) {
  const providedDigest = createHash("sha256").update(providedToken).digest();
  const expectedDigest = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}

export function createStorefrontArtifactRefreshHandler(
  dependencies: StorefrontArtifactRefreshHandlerDependencies,
) {
  return async function handleStorefrontArtifactRefresh(
    request: Request,
  ): Promise<Response> {
    const requestUrl = new URL(request.url);
    if (
      requestUrl.origin !== refreshRouteOrigin ||
      requestUrl.pathname !== refreshRoutePath ||
      requestUrl.search !== ""
    ) {
      return privateJson({ error: "not_found" }, 404);
    }

    const expectedToken = dependencies.getToken();
    if (!isCanonicalStorefrontRefreshToken(expectedToken)) {
      return privateJson(
        { error: "storefront_artifact_refresh_unavailable" },
        503,
      );
    }

    const providedToken = getBearerToken(request.headers.get("authorization"));
    if (
      !isCanonicalStorefrontRefreshToken(providedToken) ||
      !tokenMatches(providedToken, expectedToken)
    ) {
      return privateJson({ error: "unauthorized" }, 401, {
        "WWW-Authenticate": "Bearer",
      });
    }

    try {
      const result = await dependencies.refresh();
      return privateJson(
        {
          generatedAt: result.generatedAt,
          sellers: result.sellers.map((seller) => seller.id),
        },
        200,
      );
    } catch {
      return privateJson({ error: "storefront_artifact_refresh_failed" }, 503);
    }
  };
}
