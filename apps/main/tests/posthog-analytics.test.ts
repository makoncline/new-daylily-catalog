import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("posthog-js", () => ({
  default: {
    init: initMock,
    capture: captureMock,
  },
}));

describe("posthog browser analytics", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
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

  it("uses runtime config and stays disabled when PostHog is unavailable", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ posthog: { enabled: false } }), {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
        cache: "no-store",
      });
    });
    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("enables PostHog surveys when browser analytics is available", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          posthog: {
            enabled: true,
            host: "https://analytics.example.com",
            key: "phc_test",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledWith("phc_test", {
        advanced_enable_surveys: true,
        api_host: "https://analytics.example.com",
        defaults: "2026-01-30",
      });
    });
    expect(captureMock).toHaveBeenCalledWith("checkout_started", {
      source_page: "/",
    });
  });
});
