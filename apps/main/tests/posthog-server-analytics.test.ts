// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutableEnv = process.env as Record<string, string | undefined>;

describe("captureServerPosthogEvent", () => {
  let previousNodeEnv: string | undefined;
  let previousSentryEnabled: string | undefined;
  let previousDatabaseUrl: string | undefined;
  let previousAppBaseUrl: string | undefined;
  let previousPosthogKey: string | undefined;
  let previousPosthogHost: string | undefined;
  let previousClerkPublishableKey: string | undefined;
  let previousCloudflareUrl: string | undefined;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousAppBaseUrl = process.env.APP_BASE_URL;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    previousPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    previousClerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    previousCloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
    mutableEnv.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "false";
    process.env.DATABASE_URL = "file:./tests/.tmp/posthog-server.sqlite";
    process.env.APP_BASE_URL = "https://daylilycatalog.com";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cdn.example.com";
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

    if (previousSentryEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_ENABLED = previousSentryEnabled;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    if (previousAppBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = previousAppBaseUrl;
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

    if (previousClerkPublishableKey === undefined) {
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
        previousClerkPublishableKey;
    }

    if (previousCloudflareUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
    } else {
      process.env.NEXT_PUBLIC_CLOUDFLARE_URL = previousCloudflareUrl;
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

  it("does nothing in production when PostHog is not configured", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { captureServerPosthogEvent } = await import(
      "@/server/analytics/posthog-server"
    );

    await captureServerPosthogEvent({
      distinctId: "system:test",
      event: "test_event",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
