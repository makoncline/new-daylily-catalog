import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutableEnv = process.env as Record<string, string | undefined>;

describe("captureServerPosthogEvent", () => {
  let previousNodeEnv: string | undefined;
  let previousPosthogKey: string | undefined;
  let previousPosthogHost: string | undefined;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    previousPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    mutableEnv.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
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

  it("posts to PostHog capture endpoint in production", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const { captureServerPosthogEvent } = await import(
      "@/server/analytics/posthog-server"
    );

    await captureServerPosthogEvent({
      distinctId: "clerk_123",
      event: "signup_completed",
      properties: { source_page: "/api/clerk-webhook" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://us.i.posthog.com/capture/");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      api_key: "phc_test_key",
      event: "signup_completed",
      distinct_id: "clerk_123",
      properties: { source_page: "/api/clerk-webhook" },
    });
  });

  it("does nothing outside production", async () => {
    mutableEnv.NODE_ENV = "development";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { captureServerPosthogEvent } = await import(
      "@/server/analytics/posthog-server"
    );

    await captureServerPosthogEvent({
      distinctId: "clerk_123",
      event: "signup_completed",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
