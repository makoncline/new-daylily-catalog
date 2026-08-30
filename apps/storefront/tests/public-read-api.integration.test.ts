import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as getCatalog } from "@/app/api/catalog/[catalog]/route";
import { GET as getCatalogs } from "@/app/api/catalogs/route";
import { GET as getListing } from "@/app/api/listings/[listing]/route";
import { rollingOaksStorefrontFixture } from "@/fixtures/rolling-oaks-storefront";
import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
} from "@/lib/public-cache-policy";
import {
  createCatalogsHandler,
  createListingHandler,
} from "@/server/public-api/public-read-api";
import { StorefrontUnavailableError } from "@/server/storefront/errors";
import type { StorefrontSnapshot } from "@/types/storefront";

function catalogRequest(catalog: string, query = "") {
  return getCatalog(
    new Request(`https://shop.example.test/api/catalog/${catalog}${query}`),
    { params: Promise.resolve({ catalog }) },
  );
}

function listingRequest(listing: string) {
  return getListing(
    new Request(`https://shop.example.test/api/listings/${listing}`),
    { params: Promise.resolve({ listing }) },
  );
}

describe("storefront public read API", () => {
  it("lists every catalog with a deterministic version and public cache policy", async () => {
    const response = await getCatalogs();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      PUBLIC_CLOUDFLARE_CACHE_CONTROL,
    );
    expect(response.headers.get("cache-tag")).toBe(
      "daylily-storefront-public-html",
    );
    await expect(response.json()).resolves.toMatchObject({
      version: 1,
      generatedAt: rollingOaksStorefrontFixture.generatedAt,
      catalogs: [
        { kind: "for-sale", slug: "for-sale", totalCount: 6 },
        { kind: "list", slug: "display-garden", totalCount: 2 },
        { kind: "list", slug: "white-and-double", totalCount: 2 },
        { kind: "list", slug: "st.-james", totalCount: 1 },
        { kind: "all", slug: "all", totalCount: 8 },
        { kind: "search", slug: "search", totalCount: 8 },
      ],
    });
  });

  it("keeps catalog meanings, filters, unlinked listings, and pagination", async () => {
    const allResponse = await catalogRequest("all", "?page=999&limit=2");
    const allBody = (await allResponse.json()) as {
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      listings: Array<{ id: string }>;
    };
    expect(allBody).toMatchObject({
      pagination: { page: 4, limit: 2, total: 8, totalPages: 4 },
      listings: [{ id: "listing-summer-ember" }, { id: "listing-two-for-tea" }],
    });

    const forSaleResponse = await catalogRequest("for-sale", "?limit=100");
    const forSaleBody = (await forSaleResponse.json()) as {
      pagination: { total: number };
      listings: Array<{ id: string }>;
    };
    expect(forSaleBody.pagination.total).toBe(6);
    expect(forSaleBody.listings.map(({ id }) => id)).toContain(
      "listing-boundary-ten",
    );

    const filteredResponse = await catalogRequest(
      "search",
      "?list=no-list&price=10-to-19&limit=100",
    );
    const filteredBody = (await filteredResponse.json()) as {
      listings: Array<{ id: string }>;
    };
    expect(filteredBody.listings.map(({ id }) => id)).toEqual([
      "listing-boundary-ten",
      "listing-two-for-tea",
    ]);

    const rebloomResponse = await catalogRequest(
      "search",
      "?bloomSeason=Early&rebloom=true",
    );
    const rebloomBody = (await rebloomResponse.json()) as {
      listings: Array<{ id: string }>;
    };
    expect(rebloomBody.listings.map(({ id }) => id)).toEqual([
      "listing-quiet-snow",
    ]);

    const listResponse = await catalogRequest("display-garden", "?name=quiet");
    await expect(listResponse.json()).resolves.toMatchObject({
      catalog: { kind: "list", slug: "display-garden", totalCount: 2 },
      pagination: { total: 1 },
      listings: [{ id: "listing-quiet-snow" }],
    });

    const dottedListResponse = await catalogRequest("st.-james");
    await expect(dottedListResponse.json()).resolves.toMatchObject({
      catalog: { kind: "list", slug: "st.-james", totalCount: 1 },
      listings: [{ id: "listing-spring-2026", slug: "spring.2026" }],
    });

    const dottedListingResponse = await listingRequest("spring.2026");
    await expect(dottedListingResponse.json()).resolves.toMatchObject({
      listing: {
        id: "listing-spring-2026",
        slug: "spring.2026",
        catalogs: [{ slug: "st.-james" }],
      },
    });
  });

  it("returns explicit listing details without seller or private snapshot fields", async () => {
    const snapshot: StorefrontSnapshot = structuredClone(
      rollingOaksStorefrontFixture,
    );
    Object.assign(snapshot.listings[4]!, {
      privateNote: "must not cross the public interface",
    });
    const response = await createListingHandler(async () => snapshot)(
      "quiet-snow",
    );
    const body: unknown = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      version: 1,
      listing: {
        id: "listing-quiet-snow",
        slug: "quiet-snow",
        forSale: false,
        images: [
          {
            url: "/brands/rolling-oaks/daylily-3.svg",
            thumbUrl: null,
            blurUrl: null,
            order: 0,
          },
        ],
        cultivar: { details: { rebloom: true, seedlingNum: "RO-24-1" } },
        catalogs: [{ slug: "display-garden" }, { slug: "white-and-double" }],
      },
    });
    expect(serialized).not.toContain("privateNote");
    expect(serialized).not.toContain('"seller"');
    expect(serialized).not.toContain("image-listing-quiet-snow");
    expect(serialized).not.toContain("cultivar-listing-quiet-snow");
  });

  it("returns true no-store errors for missing records and unavailable data", async () => {
    const missingCatalog = await catalogRequest("missing-catalog");
    expect(missingCatalog.status).toBe(404);
    expect(missingCatalog.headers.get("cache-control")).toBe("no-store");
    expect(
      missingCatalog.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBe("no-store");
    await expect(missingCatalog.json()).resolves.toEqual({
      version: 1,
      error: { code: "catalog_not_found", message: "Catalog not found." },
    });

    const missingListing = await listingRequest("missing-listing");
    expect(missingListing.status).toBe(404);
    await expect(missingListing.json()).resolves.toEqual({
      version: 1,
      error: { code: "listing_not_found", message: "Listing not found." },
    });

    const unavailable = await createCatalogsHandler(async () => {
      throw new StorefrontUnavailableError();
    })();
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
    expect(
      unavailable.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBe("no-store");
  });
});
