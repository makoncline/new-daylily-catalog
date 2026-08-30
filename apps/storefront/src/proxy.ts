import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";

const uncachedFirstSegments = new Set([
  ".well-known",
  "_next",
  "api",
  "brands",
  "cart",
  "thanks",
]);
const nonDocumentPaths = new Set([
  "/favicon.ico",
  "/icon",
  "/llms.txt",
  "/openapi.json",
  "/robots.txt",
  "/sitemap.xml",
]);
const proxyOwnedTaggedPaths = new Set(["/favicon.ico", "/icon", "/robots.txt"]);

function acceptsMarkdown(request: NextRequest) {
  const accept = request.headers.get("accept");
  if (!accept) {
    return false;
  }

  return accept.split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.split(";");
    if (mediaType?.trim().toLowerCase() !== "text/markdown") {
      return false;
    }
    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith("q="));
    if (!quality) {
      return true;
    }
    const value = Number(quality.slice(2));
    return Number.isFinite(value) && value > 0;
  });
}

function isPrefetchRequest(request: NextRequest) {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

function isAppRouterRscRequest(request: NextRequest) {
  return (
    request.nextUrl.searchParams.has("_rsc") ||
    request.headers.get("rsc") === "1" ||
    request.headers.get("accept")?.includes("text/x-component") === true
  );
}

function hasRequestCredentials(request: NextRequest) {
  return (
    request.headers.has("authorization") ||
    request.cookies
      .getAll()
      .some(({ name }) => name === "__session" || name.startsWith("__session_"))
  );
}

function isPublicDocumentPath(pathname: string) {
  if (nonDocumentPaths.has(pathname)) {
    return false;
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);

  return !firstSegment || !uncachedFirstSegments.has(firstSegment);
}

function hasRouteOwnedPublicCachePolicy(pathname: string) {
  if (nonDocumentPaths.has(pathname)) {
    return true;
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);
  return firstSegment === ".well-known";
}

function isCanonicalAgentSkillPath(pathname: string) {
  return /^\/\.well-known\/agent-skills\/[^/]+\/SKILL\.md$/u.test(pathname);
}

function uncachedResponse() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER, "no-store");
  return response;
}

function varyOnAccept(response: NextResponse) {
  const values = new Set(
    (response.headers.get("Vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  values.add("Accept");
  response.headers.set("Vary", [...values].join(", "));
  return response;
}

function uncachedNegotiatedResponse() {
  const response = uncachedResponse();
  return varyOnAccept(response);
}

async function markdownResponse(request: NextRequest) {
  try {
    const { getStorefrontMarkdownRepresentation } = await import(
      "@/server/markdown/storefront-markdown"
    );
    const representation = await getStorefrontMarkdownRepresentation(
      new URL(request.url),
    );
    if (!representation) {
      return uncachedNegotiatedResponse();
    }

    return new NextResponse(
      request.method === "HEAD" ? null : representation.body,
      {
        status: representation.status,
        headers: {
          "Cache-Control": "no-store",
          [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: "no-store",
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  } catch {
    return new NextResponse(
      request.method === "HEAD"
        ? null
        : "# Storefront unavailable\n\nThe storefront data could not be loaded.\n",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: "no-store",
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  }
}

function cachedPublicDocumentResponse() {
  const response = NextResponse.next();
  response.headers.set(
    PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
    PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  );
  response.headers.set("Cache-Tag", PUBLIC_CLOUDFLARE_CACHE_TAG);
  return varyOnAccept(response);
}

export function proxy(request: NextRequest): NextResponse;
export function proxy(
  request: NextRequest,
): NextResponse | Promise<NextResponse> {
  if (isAppRouterRscRequest(request)) {
    return uncachedResponse();
  }

  if (acceptsMarkdown(request)) {
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      isCanonicalAgentSkillPath(request.nextUrl.pathname) &&
      !hasRequestCredentials(request) &&
      !isPrefetchRequest(request)
    ) {
      return NextResponse.next();
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      isPublicDocumentPath(request.nextUrl.pathname) &&
      !hasRequestCredentials(request) &&
      !isPrefetchRequest(request)
    ) {
      return markdownResponse(request);
    }

    return uncachedNegotiatedResponse();
  }

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    isPublicDocumentPath(request.nextUrl.pathname) &&
    !hasRequestCredentials(request) &&
    !isPrefetchRequest(request)
  ) {
    return cachedPublicDocumentResponse();
  }

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    proxyOwnedTaggedPaths.has(request.nextUrl.pathname) &&
    !hasRequestCredentials(request) &&
    !isPrefetchRequest(request)
  ) {
    return cachedPublicDocumentResponse();
  }

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    hasRouteOwnedPublicCachePolicy(request.nextUrl.pathname) &&
    !hasRequestCredentials(request) &&
    !isPrefetchRequest(request)
  ) {
    return NextResponse.next();
  }

  return uncachedResponse();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|brands(?:/|$)).*)",
    {
      source: "/:path*",
      has: [{ type: "query", key: "_rsc" }],
    },
    {
      source: "/:path*",
      has: [{ type: "header", key: "rsc", value: "1" }],
    },
  ],
};
