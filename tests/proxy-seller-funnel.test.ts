// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextMiddleware } from "next/server";

const authMock = vi.hoisted(
  () => vi.fn(async () => ({ userId: null as string | null })),
);
const createRouteMatcherMock = vi.hoisted(
  () => vi.fn((routes: string[]) => {
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
    expect(routeMatcherArg?.some((route) => route.includes("start-membership")))
      .toBe(false);

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
});
