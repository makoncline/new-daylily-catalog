import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.hoisted(() => vi.fn());
const identifyMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("posthog-js", () => ({
  default: {
    capture: captureMock,
    identify: identifyMock,
    reset: resetMock,
  },
}));

describe("posthog analytics helper", () => {
  let previousNodeEnv: string | undefined;
  let previousPosthogKey: string | undefined;

  beforeEach(() => {
    captureMock.mockClear();
    identifyMock.mockClear();
    resetMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    mutableEnv.NODE_ENV = "production";
    vi.resetModules();
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }

    if (previousPosthogKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      return;
    }

    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousPosthogKey;
  });

  it("captures events when PostHog key is configured in production", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started", {
      source: "test",
    });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith("checkout_started", {
      source: "test",
    });
  });

  it("does not capture events when PostHog key is missing", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    expect(captureMock).not.toHaveBeenCalled();
  });

  it("does not capture events outside production", async () => {
    mutableEnv.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    expect(captureMock).not.toHaveBeenCalled();
  });

  it("identifies signed-in users in PostHog", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { identifyPosthogUser } = await import("@/lib/analytics/posthog");

    identifyPosthogUser({
      id: "user_123",
      email: "user@example.com",
    });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("user_123", {
      email: "user@example.com",
    });
  });

  it("resets PostHog identity on sign-out", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { resetPosthogUser } = await import("@/lib/analytics/posthog");

    resetPosthogUser();

    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
