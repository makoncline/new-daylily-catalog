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
  it("does not run for API routes without proxy handling", async () => {
    const { config } = await import("@/proxy");

    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/api/mcp/server",
      }),
    ).toBe(false);
  });

  it("still runs for protected and auth-backed routes", async () => {
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
  });

  it("runs for public SEO HTML routes that get shared cache headers", async () => {
    const { config } = await import("@/proxy");

    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/",
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
        url: "/rollingoaksdaylilies",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/rollingoaksdaylilies/page/2",
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
        url: "/rollingoaksdaylilies/timber-man",
      }),
    ).toBe(true);
  });

  it("does not run for public SEO cache bypass variants", async () => {
    const { config } = await import("@/proxy");
    const cases = [
      {
        name: "cookie",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man",
          cookies: { __session: "fake" },
        },
      },
      {
        name: "authorization",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man",
          headers: { authorization: "Bearer fake" },
        },
      },
      {
        name: "rsc header",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man",
          headers: { rsc: "1" },
        },
      },
      {
        name: "_rsc query",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man?_rsc=abc",
        },
      },
      {
        name: "router state header",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man",
          headers: { "next-router-state-tree": "[]" },
        },
      },
      {
        name: "router prefetch header",
        input: {
          config,
          url: "/rollingoaksdaylilies/timber-man",
          headers: { "next-router-prefetch": "1" },
        },
      },
    ] as const;

    for (const { input, name } of cases) {
      expect(unstable_doesMiddlewareMatch(input), name).toBe(false);
    }
  });
});
