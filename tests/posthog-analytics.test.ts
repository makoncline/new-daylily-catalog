import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.hoisted(() => vi.fn());

vi.mock("posthog-js", () => ({
  default: {
    capture: captureMock,
  },
}));

describe("posthog analytics helper", () => {
  let previousNodeEnv: string | undefined;
  let previousPosthogKey: string | undefined;

  beforeEach(() => {
    captureMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    process.env.NODE_ENV = "production";
    vi.resetModules();
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
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
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    expect(captureMock).not.toHaveBeenCalled();
  });
});
