// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const publicReadMocks = vi.hoisted(() => ({
  getPublicCatalogRouteEntries: vi.fn(),
  getCultivarSitemapEntries: vi.fn(),
}));

vi.mock("@/server/db/public-listing-read-model", () => ({
  getPublicCatalogRouteEntries: publicReadMocks.getPublicCatalogRouteEntries,
}));

vi.mock("@/server/db/public-cultivar-read-model", () => ({
  getCultivarSitemapEntries: publicReadMocks.getCultivarSitemapEntries,
}));

const originalVercelEnv = process.env.VERCEL_ENV;
const originalVercelUrl = process.env.VERCEL_URL;
const originalVercelProjectProductionUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalPort = process.env.PORT;

describe("sitemap and robots host selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    publicReadMocks.getPublicCatalogRouteEntries.mockResolvedValue([
      {
        slug: "rolling-oaks",
        totalPages: 3,
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    publicReadMocks.getCultivarSitemapEntries.mockResolvedValue([
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

    const [{ default: sitemap }, { GET: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapEntries = await sitemap();

    expect(
      sitemapEntries.every((entry) =>
        entry.url.startsWith("https://daylilycatalog.com"),
      ),
    ).toBe(true);
    expect(
      sitemapEntries.some(
        (entry) =>
          entry.url === "https://daylilycatalog.com/rolling-oaks/page/2",
      ),
    ).toBe(true);
    expect(
      sitemapEntries.some(
        (entry) =>
          entry.url === "https://daylilycatalog.com/rolling-oaks/page/3",
      ),
    ).toBe(true);

    const robotsText = await robots().text();
    expect(robotsText).toContain("Host: https://daylilycatalog.com");
    expect(robotsText).toContain(
      "Sitemap: https://daylilycatalog.com/sitemap.xml",
    );
    expect(robotsText).toContain(
      "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
    );
    expect(robotsText).toContain("User-Agent: GPTBot");
    expect(robotsText).toContain("User-Agent: ClaudeBot");
    expect(robotsText).toContain("Disallow: /dashboard/");
  });

  it("uses the preview deployment host outside production", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "daylily-catalog-preview.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "daylilycatalog.com";

    const [{ default: sitemap }, { GET: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapEntries = await sitemap();
    expect(sitemapEntries[0]?.url).toBe(
      "https://daylily-catalog-preview.vercel.app",
    );

    const robotsText = await robots().text();
    expect(robotsText).toContain(
      "Host: https://daylily-catalog-preview.vercel.app",
    );
    expect(robotsText).toContain(
      "https://daylily-catalog-preview.vercel.app/sitemap.xml",
    );
  });

  it("falls back to localhost when no Vercel host is available", async () => {
    process.env.VERCEL_ENV = "development";
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.PORT = "4123";

    const [{ default: sitemap }, { GET: robots }] = await Promise.all([
      import("@/app/sitemap"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapEntries = await sitemap();
    expect(sitemapEntries[0]?.url).toBe("http://localhost:4123");

    const robotsText = await robots().text();
    expect(robotsText).toContain("Host: http://localhost:4123");
    expect(robotsText).toContain("Sitemap: http://localhost:4123/sitemap.xml");
  });
});
