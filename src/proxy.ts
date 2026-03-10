import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}(.*)`,
  "/subscribe/success(.*)",
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

interface CanonicalProfileLookupResponse {
  canonicalUserSlug?: string;
}

function applyNoIndexHeader(response: NextResponse) {
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
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
  const legacyProfileMatch = /^\/([^/]+)$/.exec(req.nextUrl.pathname);
  if (
    legacyProfileMatch?.[1] &&
    req.nextUrl.searchParams.has("viewing") &&
    isLegacyProfileSegment(legacyProfileMatch[1])
  ) {
    const legacyProfileSegment = legacyProfileMatch[1];
    const canonicalUserSlug = await resolveCanonicalUserSlug(
      req,
      legacyProfileSegment,
    );

    if (canonicalUserSlug && canonicalUserSlug !== legacyProfileSegment) {
      const canonicalUrl = req.nextUrl.clone();
      canonicalUrl.pathname = `/${canonicalUserSlug}`;
      return applyNoIndexHeader(NextResponse.redirect(canonicalUrl, 308));
    }

    return applyNoIndexHeader(NextResponse.next());
  }

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
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/subscribe/success/:path*",
    "/api/trpc/:path*",
    {
      source: "/:legacyProfileSegment",
      has: [{ type: "query", key: "viewing" }],
    },
  ],
};

// If legacy `?page=n` profile URLs ever matter again, prefer a `next.config.js`
// redirect over reintroducing proxy handling for public profile routes.
