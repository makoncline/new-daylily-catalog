import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import {
  hasNonPageProfileParams,
  parsePositiveInteger,
} from "@/lib/public-catalog-url-state";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  `${SUBSCRIPTION_CONFIG.NEW_USER_MEMBERSHIP_PATH}(.*)`,
]);

const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  "api",
  "auth-error",
  "catalog",
  "catalogs",
  "cultivar",
  "dashboard",
  "subscribe",
  "start-membership",
  "trpc",
  "users",
]);

function isLegacyProfileSegment(segment: string) {
  if (RESERVED_TOP_LEVEL_SEGMENTS.has(segment)) {
    return false;
  }

  return /^[A-Za-z0-9-]+$/.test(segment);
}

interface CanonicalProfileLookupResponse {
  canonicalUserSlug?: string;
}

async function resolveCanonicalUserSlug(
  req: NextRequest,
  userSlugOrId: string,
) {
  const lookupUrl = req.nextUrl.clone();
  lookupUrl.pathname = "/api/public-profile-canonical";
  lookupUrl.search = "";
  lookupUrl.searchParams.set("userSlugOrId", userSlugOrId);

  try {
    const response = await fetch(lookupUrl, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as CanonicalProfileLookupResponse;

    if (
      typeof payload.canonicalUserSlug !== "string" ||
      payload.canonicalUserSlug.length === 0
    ) {
      return null;
    }

    return payload.canonicalUserSlug;
  } catch (error) {
    console.error("Error resolving canonical user slug in proxy:", error);
    return null;
  }
}

export const proxy = clerkMiddleware(async (auth, req) => {
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
    const legacyProfileSegment = legacyProfileMatch[1];

    if (req.nextUrl.searchParams.size > 0) {
      const canonicalUserSlug = await resolveCanonicalUserSlug(
        req,
        legacyProfileSegment,
      );

      if (
        canonicalUserSlug &&
        canonicalUserSlug !== legacyProfileSegment
      ) {
        const canonicalUrl = req.nextUrl.clone();
        canonicalUrl.pathname = `/${canonicalUserSlug}`;
        return NextResponse.redirect(canonicalUrl, 308);
      }
    }

    const pageParam = req.nextUrl.searchParams.get("page");
    const requestedPage = parsePositiveInteger(pageParam, 1);
    const hasNonPageRequestParams = hasNonPageProfileParams(
      req.nextUrl.searchParams,
    );

    if (requestedPage > 1) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = `/${legacyProfileSegment}/page/${requestedPage}`;

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
