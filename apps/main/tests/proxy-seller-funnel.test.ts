// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextMiddleware } from "next/server";

const { authMock, authProtectMock } = vi.hoisted(() => {
  const protect = vi.fn(async () => undefined);
  return {
    authProtectMock: protect,
    authMock: Object.assign(
      vi.fn(async () => ({ userId: null as string | null })),
      { protect },
    ),
  };
});
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
    expect(authProtectMock).not.toHaveBeenCalled();
  });

  it("fails signed-out dashboard RSC requests closed without an external redirect", async () => {
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
    expect(authProtectMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(401);
    expect(response?.headers.get("location")).toBeNull();
  });

  it("allows signed-in dashboard RSC requests through", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });

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
    expect(authProtectMock).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it("fails signed-out onboarding RSC requests closed without an external redirect", async () => {
    const request = new NextRequest("http://localhost:3000/onboarding?_rsc=test", {
      headers: {
        accept: "text/x-component",
        "next-url": "/start-membership",
        "sec-fetch-dest": "empty",
      },
    });
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(authProtectMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(401);
    expect(response?.headers.get("location")).toBeNull();
  });

  it("delegates dashboard document navigation protection to Clerk", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard/listings");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authProtectMock).toHaveBeenCalledTimes(1);
    expect(authMock).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it("delegates onboarding protection to Clerk", async () => {
    const request = new NextRequest("http://localhost:3000/onboarding");
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authProtectMock).toHaveBeenCalledTimes(1);
    expect(authMock).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it("runs Clerk middleware for subscribe success", async () => {
    const request = new NextRequest(
      "http://localhost:3000/subscribe/success?redirect=/dashboard",
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(authProtectMock).toHaveBeenCalledTimes(1);
    expect(authMock).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });
});
