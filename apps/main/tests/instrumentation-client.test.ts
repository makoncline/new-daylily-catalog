import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  replayIntegration: vi.fn(() => ({ name: "replay" })),
  captureRouterTransitionStart: vi.fn(),
}));

describe("instrumentation-client", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
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

  it("does not initialize Sentry when runtime config disables it", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sentry: { enabled: false } }), {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await import("@/instrumentation-client");

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
        cache: "no-store",
      });
    });
    expect(initMock).not.toHaveBeenCalled();
  });
});
