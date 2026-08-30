import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StorefrontSnapshot } from "@/types";

const testState = vi.hoisted(() => ({
  browserProps: null as Record<string, unknown> | null,
  getStorefrontSnapshot: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));
vi.mock("@/server/storefront", () => ({
  getStorefrontSnapshot: testState.getStorefrontSnapshot,
}));
vi.mock("@/components/catalog/catalog-browser", async () => {
  const React = await import("react");
  return {
    CatalogBrowser: (props: Record<string, unknown>) => {
      testState.browserProps = props;
      return React.createElement("div", { "data-testid": "catalog-browser" });
    },
  };
});

import { CatalogPage } from "@/components/catalog/catalog-page";
import { rollingOaksStorefrontFixture } from "@/fixtures/rolling-oaks-storefront";
import ListCatalogPage from "@/app/catalog/[listSlug]/page";
import AllCatalogPage from "@/app/catalog/all/page";
import ForSaleCatalogPage from "@/app/catalog/for-sale/page";
import SearchCatalogPage from "@/app/catalog/search/page";

function getLargeSnapshot(): StorefrontSnapshot {
  const sourceListing = rollingOaksStorefrontFixture.listings[0]!;
  const listings = Array.from({ length: 30 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    return {
      ...structuredClone(sourceListing),
      id: `listing-plant-${sequence}`,
      slug: `plant-${sequence}`,
      title: `Plant ${sequence}`,
      description: `Plant ${sequence} catalog description.`,
      images: [
        {
          id: `image-plant-${sequence}`,
          url: `https://images.daylilycatalog.com/fixtures/plant-${sequence}-display-800.webp`,
          thumbUrl: `https://images.daylilycatalog.com/fixtures/plant-${sequence}-thumb-200.webp`,
          blurUrl: `https://images.daylilycatalog.com/fixtures/plant-${sequence}-blur-20.webp`,
          order: 0,
        },
      ],
    };
  });

  return {
    ...structuredClone(rollingOaksStorefrontFixture),
    lists: [
      {
        ...structuredClone(rollingOaksStorefrontFixture.lists[0]!),
        listingIds: listings.map((listing) => listing.id),
      },
    ],
    listings,
  };
}

beforeEach(() => {
  testState.browserProps = null;
  testState.getStorefrontSnapshot.mockReset();
});

describe("catalog server boundary", () => {
  it("passes each catalog URL query to the server catalog component", async () => {
    const searchParams = Promise.resolve({ name: "Quiet Snow", page: "2" });
    const staticPages = [AllCatalogPage, ForSaleCatalogPage, SearchCatalogPage];

    for (const page of staticPages) {
      const element = await page({ searchParams });
      expect(element).toMatchObject({ props: { searchParams } });
    }

    const listElement = await ListCatalogPage({
      params: Promise.resolve({ listSlug: "display-garden" }),
      searchParams,
    });
    expect(listElement).toMatchObject({ props: { searchParams } });
  });

  it("sends only the current page and compact card data to the client", async () => {
    testState.getStorefrontSnapshot.mockResolvedValue(getLargeSnapshot());

    renderToStaticMarkup(
      await CatalogPage({
        kind: "search",
        searchParams: Promise.resolve({ page: "2" }),
      }),
    );

    const props = testState.browserProps;
    expect(props).not.toBeNull();
    expect(props?.pagination).toEqual({
      page: 2,
      pageCount: 2,
      total: 30,
    });

    const listings = props?.listings as Array<Record<string, unknown>>;
    expect(listings).toHaveLength(6);
    expect(listings[0]).toEqual({
      id: "listing-plant-25",
      slug: "plant-25",
      title: "Plant 25",
      description: "Plant 25 catalog description.",
      price: 9.99,
      imageUrl:
        "https://images.daylilycatalog.com/fixtures/plant-25-display-800.webp",
      cartImageUrl:
        "https://images.daylilycatalog.com/fixtures/plant-25-thumb-200.webp",
      imageBlurUrl:
        "https://images.daylilycatalog.com/fixtures/plant-25-blur-20.webp",
      listTitles: ["Display Garden"],
    });
    expect(Object.keys(listings[0]!).sort()).toEqual(
      [
        "description",
        "id",
        "cartImageUrl",
        "imageBlurUrl",
        "imageUrl",
        "listTitles",
        "price",
        "slug",
        "title",
      ].sort(),
    );
    const serializedProps = JSON.stringify(props);
    expect(serializedProps).not.toContain('"cultivar"');
    expect(serializedProps).not.toContain('"listingIds"');
    expect(serializedProps).not.toContain('"seller"');
    expect(serializedProps).not.toContain('"updatedAt"');
  });
});
