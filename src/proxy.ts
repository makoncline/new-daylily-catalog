import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  hasNonPageProfileParams,
  parsePositiveInteger,
} from "@/lib/public-catalog-url-state";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}(.*)`,
]);

const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  "api",
  "auth-error",
  "catalog",
  "catalogs",
  "cultivar",
  "dashboard",
  "icon",
  "onboarding",
  "subscribe",
  "start-membership",
  "start-onboarding",
  "trpc",
  "users",
]);

function isLegacyProfileSegment(segment: string) {
  if (RESERVED_TOP_LEVEL_SEGMENTS.has(segment)) {
    return false;
  }

  return /^[A-Za-z0-9_-]+$/.test(segment);
}

export const proxy = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  const legacyProfileMatch = /^\/([^/]+)$/.exec(pathname);
  if (
    legacyProfileMatch?.[1] &&
    isLegacyProfileSegment(legacyProfileMatch[1])
  ) {
    const legacyProfileSegment = legacyProfileMatch[1];
    const hasNonPageRequestParams = hasNonPageProfileParams(
      req.nextUrl.searchParams,
    );

    const pageParam = req.nextUrl.searchParams.get("page");
    const requestedPage = parsePositiveInteger(pageParam, 1);

    if (requestedPage > 1) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = `/${legacyProfileSegment}/page/${requestedPage}`;
      redirectUrl.searchParams.delete("page");
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (hasNonPageRequestParams) {
      const response = NextResponse.next();
      response.headers.set("x-robots-tag", "noindex, nofollow");
      return response;
    }
  }

  // Handle authentication protection
  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Redirect to our custom auth error page instead of Clerk's sign-in page
      const returnTo = encodeURIComponent(req.nextUrl.pathname);
      return NextResponse.redirect(
        new URL(`/auth-error?returnTo=${returnTo}`, req.url),
      );
    }
  }
});

export default proxy;

const LEGACY_PROFILE_SEGMENT_MATCHER =
  ":legacyProfileSegment((?!api|auth-error|catalog(?:/|$)|catalogs(?:/|$)|cultivar(?:/|$)|dashboard(?:/|$)|icon(?:/|$)|onboarding(?:/|$)|start-membership(?:/|$)|start-onboarding(?:/|$)|subscribe(?:/|$)|trpc|users(?:/|$))[A-Za-z0-9_-]+)";

export const config = {
  matcher: [
    "/dashboard/:path*",
    `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}/:path*`,
    `/${LEGACY_PROFILE_SEGMENT_MATCHER}`,
  ],
};
