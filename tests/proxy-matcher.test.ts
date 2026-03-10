// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn<
    <THandler extends (...args: never[]) => unknown>(handler: THandler) => THandler
  >((handler) => handler),
  createRouteMatcher: vi.fn(() => () => false),
}));

describe("proxy matcher", () => {
  it("does not run for routes that no longer need proxy handling", async () => {
    const { config } = await import("@/proxy");

    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/api/legacy-redirect?listingId=listing-1",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/trpc/public.getProfile",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/users/user-1",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/catalog/listing-1",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/cultivar/Happy%20Returns",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/catalogs",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/start-membership",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/graceful_petals_daylilies/page/2",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/graceful_petals_daylilies?page=2",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/graceful_petals_daylilies?viewing=listing_123",
      }),
    ).toBe(false);
  });

  it("still runs for protected routes", async () => {
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
  });
});
