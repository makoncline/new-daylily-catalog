import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Handle redirects for old URLs

  // Redirect /users/{userId} to /{userId}
  const usersMatch = /^\/users\/([^\/]+)$/.exec(pathname);
  if (usersMatch?.[1]) {
    const oldUserId = usersMatch[1];
    return NextResponse.redirect(new URL(`/${oldUserId}`, req.url));
  }

  // Redirect /catalog/{listingId} to legacy-redirect API
  // Using the API instead of direct DB access in middleware to avoid Edge Runtime issues
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
