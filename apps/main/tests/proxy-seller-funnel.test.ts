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
const signInUrl = "https://accounts.daylilycatalog.com/sign-in";

function expectSignInRedirect(response: unknown) {
  const redirect = response as Response | null | undefined;

  expect(redirect?.status).toBe(307);
  expect(redirect?.headers.get("location")).toBe(signInUrl);
}

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
      NextResponse.redirect(signInUrl),
    );

    authMock.mockResolvedValue({
      isAuthenticated: true,
      redirectToSignIn: redirectToSignInMock,
    });

    ({ proxy } = await import("@/proxy"));
  });

  it("adds Cloudflare-only cache directives to public HTML document routes", async () => {
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];
    const publicDocumentUrls = [
      "http://localhost:3000/catalogs",
      "http://localhost:3000/cultivar/blue-crush",
      "http://localhost:3000/plantfancygardens",
      "http://localhost:3000/plantfancygardens/page/2",
      "http://localhost:3000/plantfancygardens/alienation",
    ];

    for (const url of publicDocumentUrls) {
      const request = new NextRequest(url, {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
        },
      });

      const response = await proxy(request, middlewareEvent);

      expect(response?.headers.get("cloudflare-cdn-cache-control")).toBe(
        "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
      );
    }

    expect(authMock).not.toHaveBeenCalled();
  });

  it("adds public HTML cache directives to crawler-shaped route requests", async () => {
    const request = new NextRequest("http://localhost:3000/plantfancygardens");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(response?.headers.get("cloudflare-cdn-cache-control")).toBe(
      "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
    );
    expect(authMock).not.toHaveBeenCalled();
  });

  it("does not add public HTML cache directives to excluded or variant routes", async () => {
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    for (const url of [
      "http://localhost:3000/start-membership",
      "http://localhost:3000/cultivars",
      "http://localhost:3000/catalogs/extra",
      "http://localhost:3000/catalog/legacy-listing",
      "http://localhost:3000/kitchen-sink",
      "http://localhost:3000/plantfancygardens/search",
      "http://localhost:3000/api/trpc/public.getListings",
      "http://localhost:3000/llms.txt",
    ]) {
      const request = new NextRequest(url, {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
        },
      });

      const response = await proxy(request, middlewareEvent);

      expect(
        response?.headers.get("cloudflare-cdn-cache-control") ?? null,
      ).toBeNull();
    }

    const rscRequest = new NextRequest(
      "http://localhost:3000/plantfancygardens?_rsc=test",
      {
        headers: {
          accept: "text/x-component",
          rsc: "1",
        },
      },
    );
    const rscResponse = await proxy(rscRequest, middlewareEvent);

    expect(rscResponse?.headers.get("cache-control")).toBe("no-store");
    expect(
      rscResponse?.headers.get("cloudflare-cdn-cache-control"),
    ).toBeNull();

    const prefetchRequest = new NextRequest(
      "http://localhost:3000/plantfancygardens",
      {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-purpose": "prefetch",
        },
      },
    );
    const prefetchResponse = await proxy(prefetchRequest, middlewareEvent);

    expect(
      prefetchResponse?.headers.get("cloudflare-cdn-cache-control") ?? null,
    ).toBeNull();
  });

  it("runs protected routes through Clerk before public HTML cache eligibility", async () => {
    const clerkRedirect = NextResponse.redirect(signInUrl);

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
    expectSignInRedirect(response);
    expect(
      response?.headers.get("cloudflare-cdn-cache-control") ?? null,
    ).toBeNull();
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

  it("keeps /onboarding publicly accessible for anonymous setup", async () => {
    const routeMatcherArg = createRouteMatcherMock.mock.calls[0]?.[0];

    expect(routeMatcherArg).toBeDefined();
    expect(routeMatcherArg?.some((route) => route.includes("onboarding"))).toBe(
      false,
    );

    const request = new NextRequest("http://localhost:3000/onboarding");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(response).toBeUndefined();
    expect(authMock).not.toHaveBeenCalled();
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
    const clerkRedirect = NextResponse.redirect(signInUrl);

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
    expectSignInRedirect(response);
  });

  it("uses forwarded host headers for protected document redirect URLs", async () => {
    const clerkRedirect = NextResponse.redirect(signInUrl);

    redirectToSignInMock.mockReturnValueOnce(clerkRedirect);
    authMock.mockResolvedValueOnce({
      isAuthenticated: false,
      redirectToSignIn: redirectToSignInMock,
    });

    const request = new NextRequest(
      "http://0.0.0.0:3000/dashboard/listings",
      {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "x-forwarded-host": "dev.daylilycatalog.com",
          "x-forwarded-proto": "https",
        },
      },
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(redirectToSignInMock).toHaveBeenCalledWith({
      returnBackUrl: new URL(
        "/dashboard/listings",
        "https://dev.daylilycatalog.com",
      ),
    });
    expectSignInRedirect(response);
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

  it("redirects unauthenticated subscribe success document navigations through Clerk", async () => {
    const clerkRedirect = NextResponse.redirect(signInUrl);

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
    expectSignInRedirect(response);
  });
});
