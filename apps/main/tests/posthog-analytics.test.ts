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
    initMock.mockReset();
    captureMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    vi.resetModules();
  });

  afterEach(() => {
    fetchMock.mockRestore();
    vi.useRealTimers();

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

  it("keeps replay links on US PostHog when ingestion uses a proxy", async () => {
    vi.useFakeTimers();
    const { PostHog } =
      await vi.importActual<typeof import("posthog-js")>("posthog-js");
    const client = new PostHog();
    initMock.mockImplementation((key, options) =>
      client.init(key, {
        ...options,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        opt_out_capturing_by_default: true,
        persistence: "memory",
      }),
    );
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
        ui_host: "https://us.posthog.com",
        defaults: "2026-01-30",
        person_profiles: "identified_only",
      });
    });
    const sessionId = client.get_session_id();
    expect(sessionId).not.toBe("");
    vi.setSystemTime(Date.now() + 65_000);
    const replayUrl = new URL(
      client.get_session_replay_url({
        withTimestamp: true,
        timestampLookBack: 30,
      }),
    );
    expect(replayUrl.origin).toBe("https://us.posthog.com");
    expect(replayUrl.pathname).toBe(`/project/phc_test/replay/${sessionId}`);
    expect(replayUrl.searchParams.get("t")).toBe("35");
    expect(captureMock).toHaveBeenCalledWith("checkout_started", {
      source_page: "/",
    });
  });
});
