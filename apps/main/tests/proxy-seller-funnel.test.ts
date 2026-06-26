// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse, type NextMiddleware } from "next/server";

const { authMock, redirectToSignInMock } = vi.hoisted(() => ({
  redirectToSignInMock: vi.fn(),
  authMock: vi.fn(),
}));
const createRouteMatcherMock = vi.hoisted(() =>
  vi.fn((routes: string[]) => {
    return (request: NextRequest) => {
      return routes.some((route) => {
        const prefix = route.replace("(.*)", "");
        if (request.nextUrl.pathname === prefix) {
          return true;
        }

        return request.nextUrl.pathname.startsWith(`${prefix}/`);
      });
    };
  }),
);

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware:
    (
      handler: (
        auth: typeof authMock,
        req: NextRequest,
      ) => Promise<Response | undefined>,
    ) =>
    (req: NextRequest) =>
      handler(authMock, req),
  createRouteMatcher: createRouteMatcherMock,
}));

describe("seller funnel proxy protection", () => {
  let proxy: NextMiddleware;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    redirectToSignInMock.mockReturnValue(
      NextResponse.redirect("https://accounts.daylilycatalog.com/sign-in"),
    );

    authMock.mockResolvedValue({
      isAuthenticated: true,
      redirectToSignIn: redirectToSignInMock,
    });

    ({ proxy } = await import("@/proxy"));
  });

  it("keeps /start-membership publicly accessible", async () => {
    const routeMatcherArg = createRouteMatcherMock.mock.calls[0]?.[0];

    expect(routeMatcherArg).toBeDefined();
    expect(
      routeMatcherArg?.some((route) => route.includes("start-membership")),
    ).toBe(false);

    const request = new NextRequest("http://localhost:3000/start-membership");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(response).toBeUndefined();
    expect(authMock).not.toHaveBeenCalled();
    expect(redirectToSignInMock).not.toHaveBeenCalled();
  });

  it("allows authenticated dashboard access", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard/listings");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(response).toBeUndefined();
    expect(redirectToSignInMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated dashboard document navigations through Clerk", async () => {
    const clerkRedirect = NextResponse.redirect(
      "https://accounts.daylilycatalog.com/sign-in",
    );

    redirectToSignInMock.mockReturnValueOnce(clerkRedirect);
    authMock.mockResolvedValueOnce({
      isAuthenticated: false,
      redirectToSignIn: redirectToSignInMock,
    });

    const request = new NextRequest("http://localhost:3000/dashboard/listings", {
      headers: {
        accept: "text/html",
        "sec-fetch-dest": "document",
      },
    });
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).toHaveBeenCalledWith({
      returnBackUrl: new URL("/dashboard/listings", "http://localhost:3000"),
    });
    expect(response).toBe(clerkRedirect);
  });

  it("returns 404 without redirect for unauthenticated dashboard RSC requests", async () => {
    authMock.mockResolvedValueOnce({
      isAuthenticated: false,
      redirectToSignIn: redirectToSignInMock,
    });

    const request = new NextRequest(
      "http://localhost:3000/dashboard/listings?_rsc=test",
      {
        headers: {
          accept: "text/x-component",
          "next-url": "/dashboard",
          "sec-fetch-dest": "empty",
        },
      },
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(404);
    expect(response?.headers.get("location")).toBeNull();
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects unauthenticated onboarding document navigations through Clerk", async () => {
    const clerkRedirect = NextResponse.redirect(
      "https://accounts.daylilycatalog.com/sign-in",
    );

    redirectToSignInMock.mockReturnValueOnce(clerkRedirect);
    authMock.mockResolvedValueOnce({
      isAuthenticated: false,
      redirectToSignIn: redirectToSignInMock,
    });

    const request = new NextRequest("http://localhost:3000/onboarding", {
      headers: {
        accept: "text/html",
        "sec-fetch-dest": "document",
      },
    });
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).toHaveBeenCalledWith({
      returnBackUrl: new URL("/onboarding", "http://localhost:3000"),
    });
    expect(response).toBe(clerkRedirect);
  });

  it("redirects unauthenticated subscribe success document navigations through Clerk", async () => {
    const clerkRedirect = NextResponse.redirect(
      "https://accounts.daylilycatalog.com/sign-in",
    );

    redirectToSignInMock.mockReturnValueOnce(clerkRedirect);
    authMock.mockResolvedValueOnce({
      isAuthenticated: false,
      redirectToSignIn: redirectToSignInMock,
    });

    const request = new NextRequest(
      "http://localhost:3000/subscribe/success?redirect=/dashboard",
      {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
        },
      },
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).toHaveBeenCalledWith({
      returnBackUrl: new URL(
        "/subscribe/success?redirect=/dashboard",
        "http://localhost:3000",
      ),
    });
    expect(response).toBe(clerkRedirect);
  });
});
