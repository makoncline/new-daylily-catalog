// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextMiddleware } from "next/server";

const authMock = vi.hoisted(() => vi.fn(async () => ({ userId: null })));
const fetchMock = vi.hoisted(() => vi.fn());

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
  createRouteMatcher: () => () => false,
}));

describe("proxy profile viewing canonicalization", () => {
  let proxy: NextMiddleware;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    ({ proxy } = await import("@/proxy"));
  });

  it("redirects legacy profile viewing links to the canonical slug and preserves params", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ canonicalUserSlug: "top-pro" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest(
      "http://localhost:3000/user_top?viewing=listing-top-prime&utm_source=e2e-test",
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(response).toBeDefined();
    expect(response?.headers.get("location")).toContain(
      "/top-pro?viewing=listing-top-prime&utm_source=e2e-test",
    );
    expect(authMock).not.toHaveBeenCalled();
  });
});
