import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());
const getDistinctIdMock = vi.hoisted(() => vi.fn(() => "anonymous-browser"));
const startSessionRecordingMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("posthog-js", () => ({
  default: {
    init: initMock,
    capture: captureMock,
    get_distinct_id: getDistinctIdMock,
    startSessionRecording: startSessionRecordingMock,
  },
}));

describe("posthog browser analytics", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    getDistinctIdMock.mockClear();
    startSessionRecordingMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    vi.resetModules();
  });

  it("initializes privacy-safe replay and exposes the browser distinct id", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          posthog: {
            enabled: true,
            key: "phc_test",
            host: "https://us.i.posthog.com",
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    const { getPosthogDistinctId, startOnboardingSessionRecording } =
      await import("@/lib/analytics/posthog");

    expect(await getPosthogDistinctId()).toBe("anonymous-browser");
    startOnboardingSessionRecording();

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledWith(
        "phc_test",
        expect.objectContaining({
          api_host: "https://us.i.posthog.com",
          session_recording: { maskAllInputs: true },
        }),
      );
      expect(startSessionRecordingMock).toHaveBeenCalledWith({
        sampling: true,
      });
    });
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
});
