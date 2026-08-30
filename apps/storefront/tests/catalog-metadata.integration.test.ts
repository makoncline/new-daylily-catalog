import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StorefrontSnapshot } from "@/types";

const testState = vi.hoisted(() => ({
  getStorefrontSnapshot: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/server/storefront", () => ({
  getStorefrontSnapshot: testState.getStorefrontSnapshot,
}));

import { generateMetadata as generateListMetadata } from "@/app/catalog/[listSlug]/page";
import { generateMetadata as generateAllMetadata } from "@/app/catalog/all/page";
import { generateMetadata as generateForSaleMetadata } from "@/app/catalog/for-sale/page";
import { generateMetadata as generateSearchMetadata } from "@/app/catalog/search/page";
import robots from "@/app/robots";
import { rollingOaksStorefrontFixture } from "@/fixtures/rolling-oaks-storefront";

function getLargeSnapshot(): StorefrontSnapshot {
  const sourceListing = rollingOaksStorefrontFixture.listings[0]!;
  const listings = Array.from({ length: 50 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    const group = index < 25 ? "Filtered" : "Other";
    return {
      ...structuredClone(sourceListing),
      id: "listing-plant-" + sequence,
      slug: "plant-" + sequence,
      title: group + " Plant " + sequence,
      price: 9.99,
    };
  });
  const sourceList = rollingOaksStorefrontFixture.lists[0]!;

  return {
    ...structuredClone(rollingOaksStorefrontFixture),
    lists: [
      {
        ...structuredClone(sourceList),
        listingIds: listings.map((listing) => listing.id),
      },
    ],
    listings,
  };
}

beforeEach(() => {
  testState.getStorefrontSnapshot.mockReset();
  testState.getStorefrontSnapshot.mockResolvedValue(getLargeSnapshot());
});

describe("catalog metadata", () => {
  it("adds canonical, previous, and next links for each catalog surface", async () => {
    const searchParams = Promise.resolve({ page: "2" });
    const cases = [
      {
        getMetadata: () => generateAllMetadata({ searchParams }),
        basePath: "/catalog/all",
      },
      {
        getMetadata: () => generateForSaleMetadata({ searchParams }),
        basePath: "/catalog/for-sale",
      },
      {
        getMetadata: () => generateSearchMetadata({ searchParams }),
        basePath: "/catalog/search",
      },
      {
        getMetadata: () =>
          generateListMetadata({
            params: Promise.resolve({ listSlug: "display-garden" }),
            searchParams,
          }),
        basePath: "/catalog/display-garden",
      },
    ];

    for (const testCase of cases) {
      const metadata = await testCase.getMetadata();
      expect(metadata.alternates?.canonical).toBe(
        testCase.basePath + "?page=2",
      );
      expect(metadata.pagination).toEqual({
        previous: testCase.basePath,
        next: testCase.basePath + "?page=3",
      });
      expect(metadata.title).toEqual(expect.stringContaining("Page 2"));
      expect(metadata.description).toContain("Page 2.");
    }
  });

  it("uses the filtered page count and clamps the canonical page", async () => {
    const metadata = await generateSearchMetadata({
      searchParams: Promise.resolve({
        name: "Filtered",
        page: "999",
      }),
    });

    expect(metadata.alternates?.canonical).toBe("/catalog/search?page=2");
    expect(metadata.pagination).toEqual({
      previous: "/catalog/search",
      next: undefined,
    });
  });

  it("keeps read APIs crawlable and preserves the content policy", async () => {
    const value = await robots();
    const rules = Array.isArray(value.rules) ? value.rules : [value.rules];

    expect(rules).toEqual([
      expect.objectContaining({
        userAgent: "*",
        allow: "/",
        disallow: ["/api/forms", "/cart", "/thanks"],
        other: {
          "Content-Signal": "search=yes, ai-train=no, ai-input=yes",
        },
      }),
    ]);
    expect(rules[0]?.disallow).not.toContain("/api/");
  });
});
