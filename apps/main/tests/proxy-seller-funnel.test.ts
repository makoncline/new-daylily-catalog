// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextMiddleware } from "next/server";

const authMock = vi.hoisted(() =>
  vi.fn(async () => ({ userId: null as string | null })),
);
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
  });

  it("redirects unauthenticated onboarding access to auth-error", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const request = new NextRequest("http://localhost:3000/onboarding");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(response?.headers.get("location")).toContain(
      "/auth-error?returnTo=%2Fonboarding",
    );
  });

  it("allows authenticated onboarding access", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });

    const request = new NextRequest("http://localhost:3000/onboarding");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(response).toBeUndefined();
  });

  it("runs Clerk middleware for subscribe success", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });

    const request = new NextRequest(
      "http://localhost:3000/subscribe/success?redirect=/dashboard",
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(response).toBeUndefined();
  });

  it("adds shared cache headers to public SEO HTML requests", async () => {
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];
    const cases = [
      { path: "/", routeType: "home" },
      { path: "/catalogs", routeType: "catalogs_index" },
      { path: "/rollingoaksdaylilies", routeType: "profile_page" },
      {
        path: "/rollingoaksdaylilies/page/2",
        routeType: "profile_page_paginated",
      },
      { path: "/cultivar/Happy-Returns", routeType: "cultivar_page" },
      {
        path: "/rollingoaksdaylilies/timber-man",
        routeType: "listing_page",
      },
    ];

    for (const { path, routeType } of cases) {
      const request = new NextRequest(`http://localhost:3000${path}`, {
        headers: {
          accept: "text/html",
        },
      });

      const response = await proxy(request, middlewareEvent);

      expect(response?.headers.get("Cache-Control")).toBe(
        "public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
      );
      expect(response?.headers.get("CDN-Cache-Control")).toBe(
        "public, max-age=900, stale-while-revalidate=86400",
      );
      expect(response?.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
        "public, max-age=900, stale-while-revalidate=86400",
      );
      expect(response?.headers.get("X-Daylily-Cache-Policy")).toBe(
        `public-seo-html; route=${routeType}`,
      );
    }

    expect(authMock).not.toHaveBeenCalled();
  });

  it("does not add public SEO cache headers to excluded routes", async () => {
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const legacyCatalogResponse = await proxy(
      new NextRequest("http://localhost:3000/catalog/listing-1", {
        headers: {
          accept: "text/html",
        },
      }),
      middlewareEvent,
    );
    const queryVariantResponse = await proxy(
      new NextRequest(
        "http://localhost:3000/rollingoaksdaylilies/timber-man?utm_source=x",
        {
          headers: {
            accept: "text/html",
          },
        },
      ),
      middlewareEvent,
    );
    const publicSearchResponse = await proxy(
      new NextRequest("http://localhost:3000/rollingoaksdaylilies/search", {
        headers: {
          accept: "text/html",
        },
      }),
      middlewareEvent,
    );
    const nonHtmlResponse = await proxy(
      new NextRequest("http://localhost:3000/rollingoaksdaylilies/timber-man", {
        headers: {
          accept: "application/json",
        },
      }),
      middlewareEvent,
    );
    const startMembershipResponse = await proxy(
      new NextRequest("http://localhost:3000/start-membership", {
        headers: {
          accept: "text/html",
        },
      }),
      middlewareEvent,
    );
    const nonNumericPageResponse = await proxy(
      new NextRequest("http://localhost:3000/rollingoaksdaylilies/page/two", {
        headers: {
          accept: "text/html",
        },
      }),
      middlewareEvent,
    );
    const extraSegmentResponse = await proxy(
      new NextRequest("http://localhost:3000/rollingoaksdaylilies/a/b", {
        headers: {
          accept: "text/html",
        },
      }),
      middlewareEvent,
    );

    expect(authMock).not.toHaveBeenCalled();
    expect(legacyCatalogResponse).toBeUndefined();
    expect(queryVariantResponse).toBeUndefined();
    expect(publicSearchResponse).toBeUndefined();
    expect(nonHtmlResponse).toBeUndefined();
    expect(startMembershipResponse).toBeUndefined();
    expect(nonNumericPageResponse).toBeUndefined();
    expect(extraSegmentResponse).toBeUndefined();
  });

  it("does not add public SEO cache headers to authenticated or Next router variant requests", async () => {
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];
    const cases: Array<{ headers: Record<string, string>; name: string }> = [
      {
        name: "cookie",
        headers: { accept: "text/html", cookie: "__session=fake" },
      },
      {
        name: "authorization",
        headers: { accept: "text/html", authorization: "Bearer fake" },
      },
      {
        name: "rsc",
        headers: { accept: "text/html", rsc: "1" },
      },
      {
        name: "next router state tree",
        headers: { accept: "text/html", "next-router-state-tree": "[]" },
      },
      {
        name: "next router prefetch",
        headers: { accept: "text/html", "next-router-prefetch": "1" },
      },
      {
        name: "next router segment prefetch",
        headers: {
          accept: "text/html",
          "next-router-segment-prefetch": "1",
        },
      },
      {
        name: "next-url",
        headers: { accept: "text/html", "next-url": "/rollingoaksdaylilies" },
      },
    ];

    for (const { headers, name } of cases) {
      const response = await proxy(
        new NextRequest("http://localhost:3000/rollingoaksdaylilies", {
          headers,
        }),
        middlewareEvent,
      );

      expect(response, name).toBeUndefined();
    }

    expect(authMock).not.toHaveBeenCalled();
  });
});
