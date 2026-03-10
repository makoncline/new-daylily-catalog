import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}(.*)`,
]);

export const proxy = clerkMiddleware(async (auth, req) => {
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
    `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}/:path*`,
    "/api/trpc/:path*",
  ],
};

// If legacy `?page=n` profile URLs ever matter again, prefer a `next.config.js`
// redirect over reintroducing proxy handling for public profile routes.
