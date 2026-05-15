import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getHomeMarkdown, getRequestBaseUrl } from "@/lib/agent-readiness";
import {
  PUBLIC_SEO_HTML_CACHE_POLICY_BY_ROUTE_TYPE,
  type PublicSeoHtmlCachePolicy,
  type PublicSeoRouteType,
  getPublicSeoRouteType,
} from "@/lib/public-seo-routes";

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

const NEXT_ROUTER_VARIANT_HEADERS = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-url",
] as const;

function hasAnyHeader(req: NextRequest, names: readonly string[]) {
  return names.some((name) => req.headers.has(name));
}

function getPublicSeoHtmlCacheRouteType(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return null;
  }

  if (req.headers.has("authorization") || req.headers.has("cookie")) {
    return null;
  }

  if (hasAnyHeader(req, NEXT_ROUTER_VARIANT_HEADERS)) {
    return null;
  }

  if (req.nextUrl.search) {
    return null;
  }

  const accept = req.headers.get("accept");
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) {
    return null;
  }

  return getPublicSeoRouteType(req.nextUrl.pathname);
}

function formatPublicSeoHtmlCacheControl(
  policy: PublicSeoHtmlCachePolicy,
  { browserMaxAge }: { browserMaxAge: number },
) {
  return `public, max-age=${browserMaxAge}, s-maxage=${policy.sMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`;
}

function formatPublicSeoHtmlCdnCacheControl(
  policy: PublicSeoHtmlCachePolicy,
) {
  return `public, max-age=${policy.sMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`;
}

function withPublicSeoHtmlCacheHeaders(routeType: PublicSeoRouteType) {
  const policy = PUBLIC_SEO_HTML_CACHE_POLICY_BY_ROUTE_TYPE[routeType];
  const response = NextResponse.next();
  response.headers.set(
    "Cache-Control",
    formatPublicSeoHtmlCacheControl(policy, { browserMaxAge: 0 }),
  );
  response.headers.set(
    "CDN-Cache-Control",
    formatPublicSeoHtmlCdnCacheControl(policy),
  );
  response.headers.set(
    "Cloudflare-CDN-Cache-Control",
    formatPublicSeoHtmlCdnCacheControl(policy),
  );
  response.headers.set(
    "X-Daylily-Cache-Policy",
    `public-seo-html; route=${routeType}`,
  );
  return response;
}

const protectedRouteProxy = clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) {
    return undefined;
  }

  const { userId } = await auth();

  if (!userId) {
    // Redirect to our custom auth error page instead of Clerk's sign-in page
    const returnTo = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/auth-error?returnTo=${returnTo}`, req.url),
    );
  }

  return undefined;
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

  const publicSeoHtmlRouteType = getPublicSeoHtmlCacheRouteType(req);
  if (publicSeoHtmlRouteType) {
    return withPublicSeoHtmlCacheHeaders(publicSeoHtmlRouteType);
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
    {
      source: "/",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
    "/.well-known/:path*",
    "/openapi.json",
    "/llms.txt",
    "/llms-full.txt",
    "/sitemap-index.xml",
    "/sitemap_index.xml",
    "/sitemap.xml.gz",
    "/api",
    "/api/v1",
    {
      source: "/catalogs",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
    {
      source: "/cultivar/:cultivarNormalizedName",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
    {
      source: "/:userSlugOrId",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
    {
      source: "/:userSlugOrId/:listingSlugOrId",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
    {
      source: "/:userSlugOrId/page/:page",
      missing: [
        { type: "header", key: "authorization" },
        { type: "header", key: "cookie" },
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-state-tree" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
        { type: "header", key: "next-url" },
        { type: "query", key: "_rsc" },
      ],
    },
  ],
};
