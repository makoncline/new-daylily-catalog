import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getHomeMarkdown, getRequestBaseUrl } from "@/lib/agent-readiness";
import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
} from "@/lib/public-cache-policy";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/subscribe/success(.*)",
]);

const fastAgentDiscoveryMisses = new Set([
  "/.well-known/http-message-signatures-directory",
  "/.well-known/mcp.json",
  "/.well-known/mcp/server-cards.json",
  "/.well-known/agent-card.json",
  "/.well-known/skills/index.json",
  "/.well-known/ucp",
  "/.well-known/acp.json",
  "/sitemap-index.xml",
  "/sitemap_index.xml",
  "/sitemap.xml.gz",
  "/api",
  "/api/v1",
]);

const publicAgentDiscoveryPaths = new Set([
  "/.well-known/api-catalog",
  "/.well-known/agent-skills/index.json",
  "/.well-known/agent-skills/daylily-catalog/SKILL.md",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-protected-resource",
  "/.well-known/mcp/server-card.json",
  "/openapi.json",
  "/llms.txt",
  "/llms-full.txt",
]);

const publicHtmlFirstSegmentExclusions = new Set([
  "_next",
  ".well-known",
  "api",
  "catalog",
  "catalogs",
  "dashboard",
  "onboarding",
  "openapi.json",
  "sign-in",
  "sign-up",
  "subscribe",
  "trpc",
  "users",
]);

function isDocumentNavigation(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  const secFetchDest = req.headers.get("sec-fetch-dest");

  return (
    secFetchDest === "document" ||
    secFetchDest === "iframe" ||
    accept.includes("text/html")
  );
}

function isPrefetchRequest(req: NextRequest) {
  return (
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

function hasAppRouterRscQuery(req: NextRequest) {
  return (
    req.nextUrl.searchParams.has("_rsc") ||
    req.url.includes("?_rsc=") ||
    req.url.includes("&_rsc=")
  );
}

function isAppRouterRscRequest(req: NextRequest) {
  return (
    hasAppRouterRscQuery(req) ||
    req.headers.get("rsc") === "1" ||
    req.headers.get("accept")?.includes("text/x-component") === true
  );
}

function hasRequestCredentials(req: NextRequest) {
  return (
    req.headers.has("authorization") ||
    req.cookies
      .getAll()
      .some(
        ({ name }) => name === "__session" || name.startsWith("__session_"),
      )
  );
}

function uncachedRscResponse() {
  const response = NextResponse.next();

  response.headers.set("Cache-Control", "no-store");

  return response;
}

function isPublicHtmlCloudflareCachePath(pathname: string) {
  if (pathname.includes(".")) {
    return false;
  }

  if (pathname === "/" || pathname === "/catalogs") {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment] = segments;

  if (!firstSegment || publicHtmlFirstSegmentExclusions.has(firstSegment)) {
    return false;
  }

  return secondSegment !== "search";
}

function isPublicHtmlCloudflareCacheRequest(req: NextRequest) {
  return (
    (req.method === "GET" || req.method === "HEAD") &&
    !isProtectedRoute(req) &&
    !hasRequestCredentials(req) &&
    !isPrefetchRequest(req) &&
    !isAppRouterRscRequest(req) &&
    isPublicHtmlCloudflareCachePath(req.nextUrl.pathname)
  );
}

function cloudflareCachedPublicHtmlResponse() {
  const response = NextResponse.next();

  response.headers.set(
    PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
    PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  );

  return response;
}

const protectedRouteProxy = clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) {
    return undefined;
  }

  const { isAuthenticated, redirectToSignIn } = await auth();

  if (isAuthenticated) {
    return undefined;
  }

  if (isDocumentNavigation(req)) {
    const requestBaseUrl = getRequestBaseUrl(req) ?? req.nextUrl.origin;

    return redirectToSignIn({
      returnBackUrl: new URL(
        `${req.nextUrl.pathname}${req.nextUrl.search}`,
        requestBaseUrl,
      ),
    });
  }

  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
    },
  });
});

export function proxy(req: NextRequest, event: NextFetchEvent) {
  if (fastAgentDiscoveryMisses.has(req.nextUrl.pathname)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  if (publicAgentDiscoveryPaths.has(req.nextUrl.pathname)) {
    return undefined;
  }

  if (
    req.nextUrl.pathname === "/" &&
    req.headers.get("accept")?.includes("text/markdown")
  ) {
    const markdown = getHomeMarkdown(getRequestBaseUrl(req) ?? req.nextUrl.origin);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(Math.ceil(markdown.length / 4)),
      },
    });
  }

  if (isAppRouterRscRequest(req) && !isProtectedRoute(req)) {
    return uncachedRscResponse();
  }

  if (isPublicHtmlCloudflareCacheRequest(req)) {
    return cloudflareCachedPublicHtmlResponse();
  }

  // Do not guard this call with isProtectedRoute(). Public routes such as
  // /onboarding and /api/trpc still need Clerk's request context for auth().
  // Keep the protected-route check inside the clerkMiddleware callback above.
  // https://clerk.com/docs/reference/nextjs/app-router/auth
  return protectedRouteProxy(req, event);
}

export default proxy;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/subscribe/success/:path*",
    "/api/trpc/:path*",
    "/.well-known/:path*",
    "/openapi.json",
    "/llms.txt",
    "/llms-full.txt",
    "/sitemap-index.xml",
    "/sitemap_index.xml",
    "/sitemap.xml.gz",
    "/api",
    "/api/v1",
    "/((?!api(?:/|$)|_next(?:/|$)|.*\\..*).*)",
    {
      source: "/:path*",
      has: [
        {
          type: "query",
          key: "_rsc",
        },
      ],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "rsc",
          value: "1",
        },
      ],
    },
  ],
};
