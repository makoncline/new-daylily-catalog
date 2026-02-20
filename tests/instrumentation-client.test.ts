import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const posthogInitMock = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  replayIntegration: vi.fn(() => ({ name: "replay" })),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInitMock,
  },
}));

describe("instrumentation-client", () => {
  let previousNodeEnv: string | undefined;
  let previousSentryEnabled: string | undefined;
  let previousPosthogKey: string | undefined;
  let previousPosthogHost: string | undefined;

  beforeEach(() => {
    initMock.mockClear();
    posthogInitMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    previousSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    previousPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "true";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
    vi.resetModules();
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousSentryEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_ENABLED = previousSentryEnabled;
    }

    if (previousPosthogKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = previousPosthogKey;
    }

    if (previousPosthogHost === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = previousPosthogHost;
    }
  });

  it("initializes posthog using public env config", async () => {
    await import("@/instrumentation-client");

    expect(posthogInitMock).toHaveBeenCalledTimes(1);
    expect(posthogInitMock).toHaveBeenCalledWith("phc_test_key", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-01-30",
    });
  });

  it("does not initialize posthog outside production", async () => {
    process.env.NODE_ENV = "development";

    await import("@/instrumentation-client");

    expect(posthogInitMock).not.toHaveBeenCalled();
  });

  it("configures ignoreErrors for abort variants", async () => {
    await import("@/instrumentation-client");

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
    expect(beforeSend({}, { originalException: { name: "AbortError" } })).toBeNull();
  });
});
