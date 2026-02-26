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

describe("public profile pagination proxy rewrites", () => {
  let proxy: NextMiddleware;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    ({ proxy } = await import("@/proxy"));
  });

  it("rewrites page query requests for underscore slugs", async () => {
    const request = new NextRequest(
      "http://localhost:3000/graceful_petals_daylilies?page=2",
    );
    const middlewareEvent = {} as Parameters<NextMiddleware>[1];

    const response = await proxy(request, middlewareEvent);

    expect(response).toBeDefined();
    expect(response?.headers.get("x-middleware-rewrite")).toContain(
      "/graceful_petals_daylilies/page/2",
    );
    expect(response?.headers.get("x-robots-tag")).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });
});
