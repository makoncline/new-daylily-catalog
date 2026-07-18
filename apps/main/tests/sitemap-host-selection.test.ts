// @vitest-environment node

import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const publicReadMocks = vi.hoisted(() => ({
  getPublicCatalogRouteEntries: vi.fn(),
  getPublicListingRouteEntries: vi.fn(),
  getCultivarSitemapEntries: vi.fn(),
  getCultivarSitemapEntryCount: vi.fn(),
}));

vi.mock("@/server/db/public-listing-read-model", () => ({
  getPublicCatalogRouteEntries: publicReadMocks.getPublicCatalogRouteEntries,
  getPublicListingRouteEntries: publicReadMocks.getPublicListingRouteEntries,
}));

vi.mock("@/server/db/public-cultivar-read-model", () => ({
  getCultivarSitemapEntries: publicReadMocks.getCultivarSitemapEntries,
  getCultivarSitemapEntryCount: publicReadMocks.getCultivarSitemapEntryCount,
}));

const originalVercelEnv = process.env.VERCEL_ENV;
const originalVercel = process.env.VERCEL;
const originalVercelUrl = process.env.VERCEL_URL;
const originalVercelProjectProductionUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL;
const originalPort = process.env.PORT;
const originalRuntimeFlagsPath = process.env.RUNTIME_FEATURE_FLAGS_PATH;
const runtimeFlagsPath = join(
  tmpdir(),
  `daylily-sitemap-feature-flags-${process.pid}.json`,
);

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("sitemap and robots host selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL;
    process.env.RUNTIME_FEATURE_FLAGS_PATH = runtimeFlagsPath;
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":false}');

    publicReadMocks.getPublicCatalogRouteEntries.mockResolvedValue([
      {
        slug: "rolling-oaks",
        totalPages: 3,
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);
    publicReadMocks.getPublicListingRouteEntries.mockResolvedValue([
      {
        sellerSlug: "rolling-oaks",
        listingSlug: "every-friday-night",
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    publicReadMocks.getCultivarSitemapEntries.mockResolvedValue([
      {
        segment: "zyzzified",
        lastModified: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);
    publicReadMocks.getCultivarSitemapEntryCount.mockResolvedValue(104_000);
  });

  afterAll(() => {
    restoreEnv("VERCEL", originalVercel);
    restoreEnv("VERCEL_ENV", originalVercelEnv);
    restoreEnv("VERCEL_URL", originalVercelUrl);
    restoreEnv(
      "VERCEL_PROJECT_PRODUCTION_URL",
      originalVercelProjectProductionUrl,
    );
    restoreEnv("PORT", originalPort);
    restoreEnv("RUNTIME_FEATURE_FLAGS_PATH", originalRuntimeFlagsPath);
    rmSync(runtimeFlagsPath, { force: true });
  });

  it("uses the production domain for production deployments", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "daylily-catalog-preview.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "daylilycatalog.com";

    const [
      { GET: sitemapIndex },
      { GET: mainSitemap },
      { GET: cultivarSitemap },
      { GET: robots },
    ] = await Promise.all([
      import("@/app/sitemap.xml/route"),
      import("@/app/sitemaps/main.xml/route"),
      import("@/app/sitemaps/cultivars/[page]/route"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapIndexText = await (await sitemapIndex()).text();
    expect(sitemapIndexText).toContain(
      "https://daylilycatalog.com/sitemaps/main.xml",
    );
    expect(sitemapIndexText).toContain(
      "https://daylilycatalog.com/sitemaps/cultivars/2.xml",
    );
    expect(sitemapIndexText).not.toContain("cultivars/3.xml");

    const mainSitemapText = await (await mainSitemap()).text();
    expect(mainSitemapText).toContain(
      "https://daylilycatalog.com/rolling-oaks/page/2",
    );
    expect(mainSitemapText).toContain(
      "https://daylilycatalog.com/rolling-oaks/page/3",
    );
    expect(mainSitemapText).toContain(
      "https://daylilycatalog.com/rolling-oaks/every-friday-night",
    );

    const cultivarSitemapResponse = await cultivarSitemap(
      new Request("http://test"),
      {
        params: Promise.resolve({ page: "0.xml" }),
      },
    );
    expect(await cultivarSitemapResponse.text()).toContain(
      "https://daylilycatalog.com/cultivar/zyzzified",
    );
    expect(publicReadMocks.getCultivarSitemapEntries).toHaveBeenCalledWith({
      page: 0,
      pageSize: 45_000,
    });

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

    const [{ GET: sitemapIndex }, { GET: robots }] = await Promise.all([
      import("@/app/sitemap.xml/route"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapIndexText = await (await sitemapIndex()).text();
    expect(sitemapIndexText).toContain(
      "https://daylily-catalog-preview.vercel.app/sitemaps/main.xml",
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

    const [{ GET: sitemapIndex }, { GET: robots }] = await Promise.all([
      import("@/app/sitemap.xml/route"),
      import("@/app/robots.txt/route"),
    ]);

    const sitemapIndexText = await (await sitemapIndex()).text();
    expect(sitemapIndexText).toContain(
      "http://localhost:4123/sitemaps/main.xml",
    );

    const robotsText = await robots().text();
    expect(robotsText).toContain("Host: http://localhost:4123");
    expect(robotsText).toContain("Sitemap: http://localhost:4123/sitemap.xml");
  });

  it("only includes feature-gated public tools when cultivar search is enabled", async () => {
    process.env.VERCEL_ENV = "development";
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.PORT = "4123";
    const { GET: mainSitemap } = await import("@/app/sitemaps/main.xml/route");

    expect(await (await mainSitemap()).text()).not.toContain(
      "<loc>http://localhost:4123/cultivars</loc>",
    );
    expect(await (await mainSitemap()).text()).not.toContain(
      "<loc>http://localhost:4123/catalog-importer</loc>",
    );

    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":true}');

    expect(await (await mainSitemap()).text()).toContain(
      "<loc>http://localhost:4123/cultivars</loc>",
    );
    expect(await (await mainSitemap()).text()).toContain(
      "<loc>http://localhost:4123/catalog-importer</loc>",
    );
  });

  it("rejects cultivar sitemap pages beyond the current replica count", async () => {
    const { GET: cultivarSitemap } = await import(
      "@/app/sitemaps/cultivars/[page]/route"
    );
    publicReadMocks.getCultivarSitemapEntries.mockClear();

    const response = await cultivarSitemap(new Request("http://test"), {
      params: Promise.resolve({ page: "3.xml" }),
    });

    expect(response.status).toBe(404);
    expect(publicReadMocks.getCultivarSitemapEntries).not.toHaveBeenCalled();
  });
});
