// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it } from "vitest";

const originalAppBaseUrl = process.env.APP_BASE_URL;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalVercelUrl = process.env.VERCEL_URL;
const originalVercelProjectProductionUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalPort = process.env.PORT;

describe("base URL helpers", () => {
  beforeEach(() => {
    delete process.env.APP_BASE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env.APP_BASE_URL = originalAppBaseUrl;
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.VERCEL_URL = originalVercelUrl;
    process.env.VERCEL_PROJECT_PRODUCTION_URL =
      originalVercelProjectProductionUrl;
    process.env.PORT = originalPort;
  });

  it("uses APP_BASE_URL as the canonical public origin when configured", async () => {
    process.env.APP_BASE_URL = "https://daylilycatalog.com/";

    const { getCanonicalBaseUrl } = await import("@/lib/utils/getBaseUrl");

    expect(getCanonicalBaseUrl()).toBe("https://daylilycatalog.com");
  });

  it("uses the forwarded request host for request-scoped URLs", async () => {
    process.env.APP_BASE_URL = "https://daylilycatalog.com";

    const { getRequestBaseUrl } = await import("@/lib/utils/getBaseUrl");
    const headers = new Headers({
      "x-forwarded-host": "prod.daylilycatalog.com",
      "x-forwarded-proto": "https",
    });

    expect(getRequestBaseUrl(headers)).toBe("https://prod.daylilycatalog.com");
  });

  it("falls back to the canonical origin when no request host is available", async () => {
    process.env.APP_BASE_URL = "https://daylilycatalog.com";

    const { getRequestBaseUrl } = await import("@/lib/utils/getBaseUrl");

    expect(getRequestBaseUrl()).toBe("https://daylilycatalog.com");
  });
});
