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
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-protected-resource",
  "/.well-known/mcp.json",
  "/.well-known/mcp/server-card.json",
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
  "/openapi.json",
  "/llms.txt",
  "/llms-full.txt",
  "/robots.txt",
  "/sitemap.xml",
]);

const protectedRouteProxy = clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    // Redirect to our custom auth error page instead of Clerk's sign-in page
    const returnTo = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/auth-error?returnTo=${returnTo}`, req.url),
    );
  }

  return NextResponse.next();
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
    return NextResponse.next();
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
    return NextResponse.next();
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
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap-index.xml",
    "/sitemap_index.xml",
    "/sitemap.xml.gz",
    "/api",
    "/api/v1",
  ],
};
