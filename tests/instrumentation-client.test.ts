import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  replayIntegration: vi.fn(() => ({ name: "replay" })),
  captureRouterTransitionStart: vi.fn(),
}));

describe("instrumentation-client", () => {
  let previousEnv: string | undefined;

  beforeEach(() => {
    initMock.mockClear();
    previousEnv = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "true";
    vi.resetModules();
  });

  afterEach(() => {
    if (previousEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_ENABLED = previousEnv;
    }
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
