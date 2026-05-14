import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const replayIntegrationMock = vi.hoisted(() =>
  vi.fn(() => ({ name: "replay" })),
);
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  replayIntegration: replayIntegrationMock,
  captureRouterTransitionStart: vi.fn(),
}));

describe("instrumentation-client", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    replayIntegrationMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sentry: {
            enabled: true,
            dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
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

  it("configures ignoreErrors for abort variants", async () => {
    await import("@/instrumentation-client");

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledTimes(1);
    });

    expect(initMock).toHaveBeenCalledTimes(1);
    const [config] = initMock.mock.calls[0] ?? [];
    const ignoreErrors = config?.ignoreErrors ?? [];

    expect(ignoreErrors).toHaveLength(4);
    expect(
      ignoreErrors.every((entry: unknown) => entry instanceof RegExp),
    ).toBe(true);

    const hasMatch = (value: string) =>
      ignoreErrors.some((entry: unknown) =>
        entry instanceof RegExp ? entry.test(value) : false,
      );

    expect(hasMatch("AbortError")).toBe(true);
    expect(hasMatch("Fetch is aborted")).toBe(true);
    expect(hasMatch("The operation was aborted")).toBe(true);
    expect(hasMatch("abort pipeTo from signal")).toBe(true);
  });

  it("drops abort events based on exception type or name", async () => {
    await import("@/instrumentation-client");

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledTimes(1);
    });

    const [config] = initMock.mock.calls.at(-1) ?? [];
    const beforeSend = config?.beforeSend;

    expect(typeof beforeSend).toBe("function");
    if (typeof beforeSend !== "function") {
      throw new Error("beforeSend not configured");
    }

    const abortEvent = { exception: { values: [{ type: "AbortError" }] } };
    const nonAbortEvent = { exception: { values: [{ type: "TypeError" }] } };

    expect(beforeSend(abortEvent)).toBeNull();
    expect(beforeSend(nonAbortEvent)).toBe(nonAbortEvent);
    expect(
      beforeSend({}, { originalException: { name: "AbortError" } }),
    ).toBeNull();
  });

  it("does not initialize sentry when runtime config disables it", async () => {
    fetchMock.mockResolvedValueOnce(
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
