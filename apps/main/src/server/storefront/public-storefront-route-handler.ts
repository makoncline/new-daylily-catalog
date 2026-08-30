import { reportError } from "@/lib/error-utils";
import { getPublicStorefrontResponse } from "@/server/storefront/public-storefront-http";
import type { PublicStorefrontArtifactLoadResult } from "@/server/storefront/public-storefront-artifacts";

export interface PublicStorefrontRouteContext {
  params: Promise<{
    sellerId: string;
  }>;
}

export type PublicStorefrontLoader = (
  sellerId: string,
) => Promise<PublicStorefrontArtifactLoadResult>;

function getErrorResponse(
  status: 400 | 404 | 500 | 503,
  error:
    | "invalid_storefront_request"
    | "storefront_not_found"
    | "internal_server_error"
    | "storefront_unavailable",
  message: string,
  headers?: Record<string, string>,
) {
  return Response.json(
    {
      error,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    },
  );
}

function hasCacheBypassDirective(request: Request) {
  const cacheControl = request.headers.get("Cache-Control")?.toLowerCase();
  if (cacheControl) {
    const directives = cacheControl.split(",").map((value) => value.trim());
    if (
      directives.some(
        (directive) =>
          directive === "no-cache" ||
          directive === "no-store" ||
          /^max-age\s*=\s*0$/.test(directive),
      )
    ) {
      return true;
    }
  }

  return request.headers
    .get("Pragma")
    ?.toLowerCase()
    .split(",")
    .some((directive) => directive.trim() === "no-cache");
}

function hasClerkSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader.split(";").some((cookie) => {
    const [name] = cookie.trim().split("=", 1);
    return name === "__session" || name?.startsWith("__session_") === true;
  });
}

function getInvalidRequestMessage(request: Request) {
  if (new URL(request.url).search) {
    return "Query parameters are not supported.";
  }

  if (
    request.headers.has("Authorization") ||
    hasClerkSessionCookie(request.headers.get("Cookie"))
  ) {
    return "Credentials are not supported.";
  }

  if (hasCacheBypassDirective(request)) {
    return "Cache bypass directives are not supported.";
  }

  return null;
}

export function createPublicStorefrontHandler(
  loadArtifact: PublicStorefrontLoader,
) {
  return async function publicStorefrontHandler(
    request: Request,
    context: PublicStorefrontRouteContext,
  ) {
    const invalidRequestMessage = getInvalidRequestMessage(request);
    if (invalidRequestMessage) {
      return getErrorResponse(
        400,
        "invalid_storefront_request",
        invalidRequestMessage,
      );
    }

    const { sellerId } = await context.params;

    try {
      const artifact = await loadArtifact(sellerId);
      if (artifact.status === "not_found") {
        return getErrorResponse(
          404,
          "storefront_not_found",
          "Storefront not found.",
        );
      }

      if (artifact.status === "unavailable") {
        return getErrorResponse(
          503,
          "storefront_unavailable",
          "Storefront data is temporarily unavailable.",
          { "Retry-After": "30" },
        );
      }

      return getPublicStorefrontResponse(request, artifact);
    } catch (error) {
      reportError({
        error,
        context: {
          sellerId,
          source: "public-storefront-api",
        },
      });

      return getErrorResponse(
        500,
        "internal_server_error",
        "Storefront could not be loaded.",
      );
    }
  };
}
