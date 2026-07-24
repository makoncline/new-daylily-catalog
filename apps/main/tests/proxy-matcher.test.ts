// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn<
    <THandler extends (...args: never[]) => unknown>(
      handler: THandler,
    ) => THandler
  >((handler) => handler),
  createRouteMatcher: vi.fn(() => () => false),
}));

describe("proxy matcher", () => {
  it("does not run for static assets", async () => {
    const { config } = await import("@/proxy");

    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/_next/static/app.js",
      }),
    ).toBe(false);
  });

  it("runs for protected, auth-backed, and public HTML cache routes", async () => {
    const { config } = await import("@/proxy");

    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/dashboard",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/onboarding",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/api/trpc/dashboardDb.user.getCurrentUser",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/api/mcp/server",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/subscribe/success?redirect=/dashboard",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/user_top?viewing=listing-top-prime",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/catalogs",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/cultivar/Happy%20Returns",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/graceful_petals_daylilies/page/2",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/graceful_petals_daylilies/20-16",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/guides/growing/soil",
      }),
    ).toBe(true);
  });
});
