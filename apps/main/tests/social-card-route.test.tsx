// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSharp } from "next/dist/server/image-optimizer";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSocialCard } from "@/components/public-social-card";

const mocks = vi.hoisted(() => ({
  getPublicSocialCardData: vi.fn(),
  getPublicCultivarSocialCardData: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/server/db/public-social-card-read-model", () => ({
  getPublicSocialCardData: mocks.getPublicSocialCardData,
}));

vi.mock("@/server/db/public-cultivar-social-card-read-model", () => ({
  getPublicCultivarSocialCardData: mocks.getPublicCultivarSocialCardData,
}));

vi.mock("@/lib/error-utils", () => ({
  reportError: mocks.reportError,
}));

async function expectSocialPng(response: Response) {
  const image = Buffer.from(await response.arrayBuffer());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  expect(image.byteLength).toBeGreaterThan(10_000);
  return image;
}

describe("social card route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    // Match a production process that has already handled an optimized image.
    getSharp(undefined, undefined);
  });

  it("renders a warmed production catalog PNG from ImageAsset WebP data", async () => {
    const webp = await readFile(
      join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
    const nativeFetch = globalThis.fetch;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.startsWith("https://media.daylilycatalog.com/")) {
        return new Response(webp, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
          },
        });
      }

      return nativeFetch(input, init);
    });
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

    await expectSocialPng(response);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
      "public, max-age=900, stale-while-revalidate=86400, stale-if-error=86400",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://media.daylilycatalog.com/image-assets/seller/display.webp",
      expect.objectContaining({
        cache: "force-cache",
      }),
    );
  }, 15_000);

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

  it("renders a warmed production listing PNG", async () => {
    mocks.getPublicSocialCardData.mockResolvedValue({
      kind: "listing",
      title: "Coffee Frenzy",
      sellerTitle: "RollingOaksDaylilies",
      hybridizer: "Kay Cline",
      year: "2014",
      price: 12,
      imageUrls: [],
    });

    const { GET } = await import("@/app/api/og/[kind]/[id]/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/og/listing/listing-1"),
      {
        params: Promise.resolve({ kind: "listing", id: "listing-1" }),
      },
    );

    await expectSocialPng(response);
  });

  it("renders a cultivar PNG with the shared Cloudflare cache policy", async () => {
    const webp = await readFile(
      join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.startsWith("https://media.daylilycatalog.com/")) {
          return new Response(webp, { status: 200 });
        }
        return nativeFetch(input, init);
      }),
    );
    mocks.getPublicCultivarSocialCardData.mockResolvedValue({
      kind: "cultivar",
      title: "Millions of Peaches",
      imageUrls: ["https://media.daylilycatalog.com/cultivars/generated.webp"],
      ahsListing: {
        hybridizer: "Kay Cline",
        year: "2021",
        scapeHeight: '26"',
        bloomSize: '3"',
        bloomSeason: "Early-Midseason",
        form: "Single",
        ploidy: "Diploid",
        foliageType: "Evergreen",
        bloomHabit: "Diurnal",
        budcount: "25",
        branches: "5",
        parentage: "(Little Red Dumples x unknown)",
        color: "Pale peach with a green throat and subtle, stippled pink halo.",
      },
    });

    const { GET } = await import("@/app/api/og/[kind]/[id]/route");
    const response = await GET(
      new Request(
        "https://daylilycatalog.com/api/og/cultivar/millions-of-peaches?v=8",
      ),
      {
        params: Promise.resolve({
          kind: "cultivar",
          id: "millions-of-peaches",
        }),
      },
    );

    const shareImage = await expectSocialPng(response);
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
      "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
    );
    expect(mocks.getPublicSocialCardData).not.toHaveBeenCalled();

    const printResponse = await GET(
      new Request(
        "https://daylilycatalog.com/api/og/cultivar/millions-of-peaches?v=8&variant=print",
      ),
      {
        params: Promise.resolve({
          kind: "cultivar",
          id: "millions-of-peaches",
        }),
      },
    );
    const printImage = await expectSocialPng(printResponse);
    const [shareBackground, printBackground] = await Promise.all([
      sharp(shareImage)
        .extract({ left: 10, top: 10, width: 1, height: 1 })
        .raw()
        .toBuffer(),
      sharp(printImage)
        .extract({ left: 10, top: 10, width: 1, height: 1 })
        .raw()
        .toBuffer(),
    ]);
    expect(shareBackground[0]).toBeLessThan(40);
    expect(printBackground[0]).toBeGreaterThan(245);
    expect(printResponse.headers.get("cloudflare-cdn-cache-control")).toBe(
      response.headers.get("cloudflare-cdn-cache-control"),
    );
  }, 30_000);

  it("does not give missing cultivars the successful Cloudflare TTL", async () => {
    mocks.getPublicCultivarSocialCardData.mockResolvedValue(null);

    const { GET } = await import("@/app/api/og/[kind]/[id]/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/og/cultivar/missing?v=8"),
      { params: Promise.resolve({ kind: "cultivar", id: "missing" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.has("cloudflare-cdn-cache-control")).toBe(false);
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
