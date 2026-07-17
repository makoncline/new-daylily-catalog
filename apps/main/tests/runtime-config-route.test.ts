import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("runtime config route", () => {
  let previousSentryEnabled: string | undefined;
  let previousSentryEnvironment: string | undefined;
  let previousSentryRelease: string | undefined;
  let previousVercelEnvironment: string | undefined;
  let previousPosthogKey: string | undefined;
  let previousPosthogHost: string | undefined;
  let previousClerkPublishableKey: string | undefined;
  let previousCloudflareUrl: string | undefined;
  let consoleInfoMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    previousSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    previousSentryEnvironment = process.env.SENTRY_ENVIRONMENT;
    previousSentryRelease = process.env.SENTRY_RELEASE;
    previousVercelEnvironment = process.env.VERCEL_ENV;
    previousPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    previousPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    previousClerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    previousCloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
    consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {
      return undefined;
    });
    vi.resetModules();
  });

  afterEach(() => {
    consoleInfoMock.mockRestore();

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

    if (previousVercelEnvironment === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previousVercelEnvironment;
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

  it("returns runtime observability settings from server env", async () => {
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "false";
    process.env.SENTRY_ENVIRONMENT = "prod-like";
    process.env.SENTRY_RELEASE = "0123456789abcdef";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_runtime_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cdn.example.com";
    const { GET } = await import("@/app/api/runtime-config/route");

    const response = GET();

    await expect(response.json()).resolves.toEqual({
      sentry: {
        enabled: false,
        dsn: "https://b3773458fec6aa0c594a9c1c73ed046a@o1136137.ingest.us.sentry.io/4508939597643776",
        environment: "prod-like",
        release: "0123456789abcdef",
      },
      posthog: {
        enabled: true,
        key: "phc_runtime_key",
        host: "https://eu.i.posthog.com",
      },
      features: {
        publicCultivarSearch: false,
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    expect(consoleInfoMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(consoleInfoMock.mock.calls[0]?.[0] as string),
    ).toMatchObject({
      event: "observability_status",
      sentryEnvironment: "prod-like",
      sentry: {
        enabled: false,
      },
      posthog: {
        enabled: true,
        keyConfigured: true,
      },
    });
  });

  it("returns disabled PostHog config when PostHog env is missing", async () => {
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = "false";
    delete process.env.SENTRY_ENVIRONMENT;
    process.env.VERCEL_ENV = "preview";
    delete process.env.SENTRY_RELEASE;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cdn.example.com";
    const { GET } = await import("@/app/api/runtime-config/route");

    const response = GET();

    await expect(response.json()).resolves.toMatchObject({
      sentry: {
        enabled: false,
        environment: "preview",
        release: null,
      },
      posthog: {
        enabled: false,
      },
      features: {
        publicCultivarSearch: false,
      },
    });
  });
});
