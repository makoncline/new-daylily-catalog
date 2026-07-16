// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSocialCard } from "@/components/public-social-card";

const mocks = vi.hoisted(() => ({
  getPublicSocialCardData: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/server/db/public-social-card-read-model", () => ({
  getPublicSocialCardData: mocks.getPublicSocialCardData,
}));

vi.mock("@/lib/error-utils", () => ({
  reportError: mocks.reportError,
}));

describe("social card route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a Facebook-sized PNG from ImageAsset WebP data", async () => {
    const webp = await readFile(
      join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(webp, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.getPublicSocialCardData.mockResolvedValue({
      kind: "catalog",
      title: "Mountain View Daylilies",
      location: "Colorado",
      listingCount: 248,
      imageUrls: [
        "https://media.daylilycatalog.com/image-assets/seller/display.webp",
      ],
    });

    const { GET } = await import("@/app/api/og/[kind]/[id]/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/og/catalog/seller-1"),
      {
        params: Promise.resolve({ kind: "catalog", id: "seller-1" }),
      },
    );
    const image = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300",
    );
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
      "public, max-age=900, stale-while-revalidate=86400, stale-if-error=86400",
    );
    expect(image.subarray(1, 4).toString()).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    expect(image.byteLength).toBeGreaterThan(10_000);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://media.daylilycatalog.com/image-assets/seller/display.webp",
      expect.objectContaining({
        cache: "force-cache",
      }),
    );
  });

  it("rejects unknown social card kinds before reading public data", async () => {
    const { GET } = await import("@/app/api/og/[kind]/[id]/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/og/private/seller-1"),
      {
        params: Promise.resolve({ kind: "private", id: "seller-1" }),
      },
    );

    expect(response.status).toBe(404);
    expect(mocks.getPublicSocialCardData).not.toHaveBeenCalled();
  });

  it("shows available hybridizer and year beneath a listing title", () => {
    const markup = renderToStaticMarkup(
      <PublicSocialCard
        data={{
          kind: "listing",
          title: "Coffee Frenzy",
          sellerTitle: "RollingOaksDaylilies",
          hybridizer: "Kay Cline",
          year: "2014",
          price: 12,
          imageUrls: [],
        }}
      />,
    );

    expect(markup).toContain("Coffee Frenzy");
    expect(markup).toContain("Kay Cline, 2014");
  });
});
