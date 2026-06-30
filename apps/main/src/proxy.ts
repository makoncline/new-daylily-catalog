import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getHomeMarkdown, getRequestBaseUrl } from "@/lib/agent-readiness";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}(.*)`,
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

function isDocumentNavigation(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  const secFetchDest = req.headers.get("sec-fetch-dest");

  return (
    secFetchDest === "document" ||
    secFetchDest === "iframe" ||
    accept.includes("text/html")
  );
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

  if (req.nextUrl.pathname === "/") {
    return undefined;
  }

  return protectedRouteProxy(req, event);
}

export default proxy;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/subscribe/success/:path*",
    "/api/trpc/:path*",
    "/",
    "/.well-known/:path*",
    "/openapi.json",
    "/llms.txt",
    "/llms-full.txt",
    "/sitemap-index.xml",
    "/sitemap_index.xml",
    "/sitemap.xml.gz",
    "/api",
    "/api/v1",
  ],
};
