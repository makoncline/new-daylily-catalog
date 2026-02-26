// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn(async () => ({ userId: null })));

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
  let proxy: (req: NextRequest) => Promise<Response | undefined>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ proxy } = await import("@/proxy"));
  });

  it("rewrites page query requests for underscore slugs", async () => {
    const request = new NextRequest(
      "http://localhost:3000/graceful_petals_daylilies?page=2",
    );

    const response = await proxy(request);

    expect(response).toBeDefined();
    expect(response?.headers.get("x-middleware-rewrite")).toContain(
      "/graceful_petals_daylilies/page/2",
    );
    expect(response?.headers.get("x-robots-tag")).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });
});
