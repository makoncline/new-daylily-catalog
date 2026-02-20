import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import {
  hasNonPageProfileParams,
  parsePositiveInteger,
} from "@/lib/public-catalog-url-state";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  "api",
  "auth-error",
  "catalog",
  "catalogs",
  "cultivar",
  "dashboard",
  "subscribe",
  "trpc",
  "users",
]);

function isLegacyProfileSegment(segment: string) {
  if (RESERVED_TOP_LEVEL_SEGMENTS.has(segment)) {
    return false;
  }

  return /^[A-Za-z0-9-]+$/.test(segment);
}

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  const legacyProfileInternalPageMatch = /^\/([^/]+)\/page\/(\d+)$/.exec(
    pathname,
  );
  if (
    legacyProfileInternalPageMatch?.[1] &&
    legacyProfileInternalPageMatch[2] &&
    isLegacyProfileSegment(legacyProfileInternalPageMatch[1])
  ) {
    const requestedPage = parsePositiveInteger(
      legacyProfileInternalPageMatch[2],
      1,
    );
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = `/${legacyProfileInternalPageMatch[1]}`;

    if (requestedPage > 1) {
      redirectUrl.searchParams.set("page", String(requestedPage));
    } else {
      redirectUrl.searchParams.delete("page");
    }

    return NextResponse.redirect(redirectUrl, 308);
  }

  const legacyProfileMatch = /^\/([^/]+)$/.exec(pathname);
  if (
    legacyProfileMatch?.[1] &&
    isLegacyProfileSegment(legacyProfileMatch[1])
  ) {
    const pageParam = req.nextUrl.searchParams.get("page");
    const requestedPage = parsePositiveInteger(pageParam, 1);
    const hasNonPageRequestParams = hasNonPageProfileParams(
      req.nextUrl.searchParams,
    );

    if (requestedPage > 1) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = `/${legacyProfileMatch[1]}/page/${requestedPage}`;

      const response = NextResponse.rewrite(rewriteUrl);
      if (hasNonPageRequestParams) {
        response.headers.set("x-robots-tag", "noindex, nofollow");
      }
      return response;
    }

    if (hasNonPageRequestParams) {
      const response = NextResponse.next();
      response.headers.set("x-robots-tag", "noindex, nofollow");
      return response;
    }
  }

  const cultivarMatch = /^\/cultivar\/([^\/]+)$/.exec(pathname);
  if (cultivarMatch?.[1]) {
    const rawCultivarSegment = cultivarMatch[1];
    let decodedCultivarSegment = rawCultivarSegment;

    try {
      decodedCultivarSegment = decodeURIComponent(rawCultivarSegment);
    } catch {}

    const canonicalCultivarSegment = toCultivarRouteSegment(
      decodedCultivarSegment,
    );

    if (
      canonicalCultivarSegment &&
      rawCultivarSegment !== canonicalCultivarSegment
    ) {
      const canonicalUrl = req.nextUrl.clone();
      canonicalUrl.pathname = `/cultivar/${canonicalCultivarSegment}`;
      return NextResponse.redirect(canonicalUrl, 308);
    }
  }

  // Handle redirects for old URLs

  // Redirect /users/{userId} to /{userId}
  const usersMatch = /^\/users\/([^\/]+)$/.exec(pathname);
  if (usersMatch?.[1]) {
    const oldUserId = usersMatch[1];
    return NextResponse.redirect(new URL(`/${oldUserId}`, req.url));
  }

  // Redirect /catalog/{listingId} to legacy-redirect API
  // Using the API instead of direct DB access in proxy to avoid Edge Runtime issues
  const catalogMatch = /^\/catalog\/([^\/]+)$/.exec(pathname);
  if (catalogMatch?.[1]) {
    const listingId = catalogMatch[1];
    return NextResponse.redirect(
      new URL(`/api/legacy-redirect?listingId=${listingId}`, req.url),
    );
  }

  // Handle authentication protection
  if (!userId && isProtectedRoute(req)) {
    // Redirect to our custom auth error page instead of Clerk's sign-in page
    const returnTo = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/auth-error?returnTo=${returnTo}`, req.url),
    );
  }
});

export default proxy;

export const config = {
  matcher: [
    // Legacy URL patterns to match
    "/users/:path*",
    "/catalog/:path*",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
