import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());
const identifyMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("posthog-js", () => ({
  default: {
    init: initMock,
    capture: captureMock,
    identify: identifyMock,
    reset: resetMock,
  },
}));

describe("posthog analytics helper", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    identifyMock.mockClear();
    resetMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          posthog: {
            enabled: true,
            key: "phc_runtime_key",
            host: "https://us.i.posthog.com",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    window.history.replaceState({}, "", "/test-page");
    vi.resetModules();
  });

  afterEach(() => {
    fetchMock.mockRestore();

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }
  });

  it("initializes PostHog from runtime config before capturing events", async () => {
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started", {
      source: "test",
    });

    await vi.waitFor(() => {
      expect(captureMock).toHaveBeenCalledWith("checkout_started", {
        source: "test",
        source_page: "/test-page",
      });
    });

    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it("uses the provided source_page when present", async () => {
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started", {
      source: "test",
      source_page: "/explicit",
    });

    await vi.waitFor(() => {
      expect(captureMock).toHaveBeenCalledWith("checkout_started", {
        source: "test",
        source_page: "/explicit",
      });
    });
  });

  it("identifies signed-in users in PostHog", async () => {
    const { identifyPosthogUser } = await import("@/lib/analytics/posthog");

    identifyPosthogUser({
      id: "user_123",
      email: "user@example.com",
    });

    await vi.waitFor(() => {
      expect(identifyMock).toHaveBeenCalledWith("user_123", {
        email: "user@example.com",
      });
    });
  });

  it("resets PostHog identity on sign-out", async () => {
    const { resetPosthogUser } = await import("@/lib/analytics/posthog");

    resetPosthogUser();

    await vi.waitFor(() => {
      expect(resetMock).toHaveBeenCalledTimes(1);
    });
  });

  it("retries PostHog initialization after a runtime config failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    try {
      capturePosthogEvent("checkout_started");

      await vi.waitFor(() => {
        expect(consoleErrorMock).toHaveBeenCalledWith(
          "PostHog initialization failed",
          expect.any(Error),
        );
      });

      capturePosthogEvent("checkout_redirect_ready");

      await vi.waitFor(() => {
        expect(captureMock).toHaveBeenCalledWith("checkout_redirect_ready", {
          source_page: "/test-page",
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      consoleErrorMock.mockRestore();
    }
  });
});
