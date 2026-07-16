import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
}));

describe("Sentry server attribution", () => {
  let previousNodeEnv: string | undefined;
  let previousSentryEnabled: string | undefined;
  let previousSentryEnvironment: string | undefined;
  let previousSentryRelease: string | undefined;
  let consoleInfoMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    previousSentryEnvironment = process.env.SENTRY_ENVIRONMENT;
    previousSentryRelease = process.env.SENTRY_RELEASE;
    mutableEnv.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "true";
    process.env.SENTRY_ENVIRONMENT = "prod-like";
    process.env.SENTRY_RELEASE = "0123456789abcdef";
    consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {
      return undefined;
    });
    initMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    consoleInfoMock.mockRestore();

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }

    if (previousSentryEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_ENABLED = previousSentryEnabled;
    }

    if (previousSentryRelease === undefined) {
      delete process.env.SENTRY_RELEASE;
    } else {
      process.env.SENTRY_RELEASE = previousSentryRelease;
    }

    if (previousSentryEnvironment === undefined) {
      delete process.env.SENTRY_ENVIRONMENT;
    } else {
      process.env.SENTRY_ENVIRONMENT = previousSentryEnvironment;
    }
  });

  it("uses the same runtime environment and release for Node and edge events", async () => {
    await import("../sentry.server.config");
    await import("../sentry.edge.config");

    expect(initMock).toHaveBeenCalledTimes(2);
    for (const [options] of initMock.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          environment: "prod-like",
          release: "0123456789abcdef",
        }),
      );
    }
  });
});
