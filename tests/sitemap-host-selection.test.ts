// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const publicCacheMocks = vi.hoisted(() => ({
  getCachedPublicCatalogRouteEntries: vi.fn(),
  getCachedCultivarSitemapEntries: vi.fn(),
}));

vi.mock("@/server/db/public-cache", () => ({
  getCachedPublicCatalogRouteEntries:
    publicCacheMocks.getCachedPublicCatalogRouteEntries,
  getCachedCultivarSitemapEntries:
    publicCacheMocks.getCachedCultivarSitemapEntries,
}));

const originalVercelEnv = process.env.VERCEL_ENV;
const originalVercelUrl = process.env.VERCEL_URL;
const originalVercelProjectProductionUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalPort = process.env.PORT;

describe("sitemap and robots host selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    publicCacheMocks.getCachedPublicCatalogRouteEntries.mockResolvedValue([
      {
        slug: "rolling-oaks",
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    publicCacheMocks.getCachedCultivarSitemapEntries.mockResolvedValue([
      {
        segment: "zyzzified",
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);
  });

  afterAll(() => {
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.VERCEL_URL = originalVercelUrl;
    process.env.VERCEL_PROJECT_PRODUCTION_URL =
      originalVercelProjectProductionUrl;
    process.env.PORT = originalPort;
  });

  it("uses the production domain for production deployments", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "daylily-catalog-preview.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "daylilycatalog.com";

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots"),
    ]);

    const sitemapEntries = await sitemap();

    expect(
      sitemapEntries.every((entry) =>
        entry.url.startsWith("https://daylilycatalog.com"),
      ),
    ).toBe(true);

    const robotsFile = robots();
    expect(robotsFile.host).toBe("https://daylilycatalog.com");
    expect(robotsFile.sitemap).toBe("https://daylilycatalog.com/sitemap.xml");
  });

  it("uses the preview deployment host outside production", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "daylily-catalog-preview.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "daylilycatalog.com";

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots"),
    ]);

    const sitemapEntries = await sitemap();
    expect(sitemapEntries[0]?.url).toBe(
      "https://daylily-catalog-preview.vercel.app",
    );

    const robotsFile = robots();
    expect(robotsFile.host).toBe("https://daylily-catalog-preview.vercel.app");
    expect(robotsFile.sitemap).toBe(
      "https://daylily-catalog-preview.vercel.app/sitemap.xml",
    );
  });

  it("falls back to localhost when no Vercel host is available", async () => {
    process.env.VERCEL_ENV = "development";
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.PORT = "4123";

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots"),
    ]);

    const sitemapEntries = await sitemap();
    expect(sitemapEntries[0]?.url).toBe("http://localhost:4123");

    const robotsFile = robots();
    expect(robotsFile.host).toBe("http://localhost:4123");
    expect(robotsFile.sitemap).toBe("http://localhost:4123/sitemap.xml");
  });
});
