import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureTraceContext,
  enrichSentryEvent,
  installConsoleLogging,
  setErrorContext,
} from "@/lib/telemetry";
import type { MockInstance } from "vitest";
import type { BrowserOptions, ErrorEvent } from "@sentry/nextjs";

const initMock = vi.hoisted(() => vi.fn());
const getSessionIdMock = vi.hoisted(() => vi.fn(() => ""));
const replayUrlMock = vi.hoisted(() => vi.fn());
vi.mock("posthog-js", () => ({
  default: {
    get_session_id: getSessionIdMock,
    get_session_replay_url: replayUrlMock,
  },
}));
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  getActiveSpan: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "replay" })),
  captureRouterTransitionStart: vi.fn(),
}));

describe("instrumentation-client", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    getSessionIdMock.mockReturnValue("");
    replayUrlMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    vi.resetModules();
  });

  afterEach(() => {
    installConsoleLogging()();
    configureTraceContext(() => undefined);
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

  it("links browser errors to the current replay without exposing request data", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          sentry: {
            enabled: true,
            dsn: "https://public@example.com/1",
            environment: "preview",
            release: "0123456789abcdef",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await import("@/instrumentation-client");

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://public@example.com/1",
          environment: "preview",
          release: "0123456789abcdef",
        }),
      );
    });
    const options = initMock.mock.calls[0]![0] as BrowserOptions;
    const capture = (event: ErrorEvent) => options.beforeSend!(event, {});
    const sessionId = "01900000-1111-7000-8000-000000000001";
    const replayUrl = `https://us.posthog.com/project/test/replay/${sessionId}?t=30`;
    getSessionIdMock.mockReturnValue(sessionId);
    replayUrlMock.mockReturnValue(replayUrl);
    const event = await capture({
      type: undefined,
      extra: { correlation_id: "request-12345678" },
      request: {
        url: "https://example.test/dashboard?private=draft",
        cookies: { session: "private" },
        data: "private input",
      },
    });
    expect(event).toMatchObject({
      tags: {
        correlation_id: "request-12345678",
        posthog_session_id: sessionId,
      },
      contexts: { posthog: { session_id: sessionId, replay_url: replayUrl } },
      request: { url: "https://example.test/dashboard" },
    });
    expect(JSON.stringify(event)).not.toContain("private");
    expect(replayUrlMock).toHaveBeenCalledWith({
      withTimestamp: true,
      timestampLookBack: 30,
    });
    const lookupError = new Error("Member lookup failed");
    setErrorContext(lookupError, {
      correlation_id: "request-12345678",
      clerk_user_id: "user_example",
    });
    expect(
      enrichSentryEvent({}, { originalException: lookupError }).user,
    ).toEqual({ id: "user_example" });
    getSessionIdMock.mockReturnValue("");
    expect((await capture({ type: undefined }))?.contexts).not.toHaveProperty(
      "posthog",
    );
  });
});
