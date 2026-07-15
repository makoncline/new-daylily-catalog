import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CultivarSearchPageClient } from "@/app/(public)/cultivars/_components/cultivar-search-page-client";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("@/components/optimized-image", () => ({
  OptimizedImage: ({ alt }: { alt: string }) => (
    <div role="img" aria-label={alt} />
  ),
}));

class ResizeObserverMock {
  observe() {
    return;
  }

  unobserve() {
    return;
  }

  disconnect() {
    return;
  }
}

if (!globalThis.ResizeObserver) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    writable: true,
  });
}

function searchResponse() {
  return {
    pagination: {
      hasMore: false,
      limit: 24,
      nextOffset: null,
    },
    results: [
      {
        canonicalUrl: "https://daylilycatalog.com/cultivar/stella-de-oro",
        cultivarReferenceId: "cultivar-stella",
        imageAsset: null,
        imageUrl: "https://media.example.com/stella.webp",
        listingSummary: {
          catalogsWithListings: 3,
          forSaleListings: 1,
        },
        matchedOn: "Exact cultivar",
        name: "Stella de Oro",
        normalizedName: "stella de oro",
        source: {
          dataSource: "AHS V2 cultivar data",
          updatedAt: "2026-07-14T00:00:00.000Z",
        },
        traits: {
          bloomSeason: "Early Mid",
          bloomSizeIn: 2.75,
          color: "gold with a deeper throat",
          foliageType: "Dormant",
          form: "Single",
          hybridizer: "Jablonski",
          ploidy: "Diploid",
          rebloom: true,
          scapeHeightIn: 11,
          year: 1975,
        },
      },
    ],
  };
}

describe("CultivarSearchPageClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      json: async () => searchResponse(),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searches the compact public index and applies cultivar-photo filters", async () => {
    render(
      <CultivarSearchPageClient
        initialState={{
          hasCultivarPhoto: false,
          hasForSaleListings: false,
          hasListings: false,
          form: "Spider|Double|Spider",
          priceMax: "286",
          q: "Stella de Oro",
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Stella de Oro" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Stella de Oro/ })).toHaveAttribute(
      "href",
      "/cultivar/stella-de-oro",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/v1/cultivars/search?form=Double%7CSpider&limit=24&mode=summary&offset=0&priceMax=286&q=Stella+de+Oro&sort=relevance",
    );
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/cultivars?form=Double%7CSpider&priceMax=286&q=Stella+de+Oro",
    );

    fireEvent.click(screen.getByRole("button", { name: "With photos" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("hasCultivarPhoto=true"),
        ),
      ).toBe(true);
    });
  });

  it("exposes the complete advanced filter groups and sends their values", async () => {
    render(
      <CultivarSearchPageClient
        initialState={{
          hasCultivarPhoto: false,
          hasForSaleListings: false,
          hasListings: false,
          q: "",
        }}
      />,
    );

    await screen.findByRole("heading", { name: "Stella de Oro" });
    fireEvent.click(screen.getByRole("switch", { name: "Advanced" }));

    expect(
      screen.getByText("Listing", { selector: "section > div" }),
    ).toBeVisible();
    expect(
      screen.getByText("Registration", { selector: "section > div" }),
    ).toBeVisible();
    expect(
      screen.getByText("Bloom Traits", { selector: "section > div" }),
    ).toBeVisible();
    expect(
      screen.getByText("Classification & Details", {
        selector: "section > div",
      }),
    ).toBeVisible();
    expect(screen.getByTestId("advanced-filter-bloom-size")).toBeVisible();
    expect(screen.getByTestId("advanced-filter-budcount")).toBeVisible();
    expect(screen.getByTestId("advanced-filter-parentage")).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText("Search listing title"), {
      target: { value: "division" },
    });
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("listingTitle=division"),
      ),
    ).toBe(false);
    const scapeHeightMinimum = screen.getByTestId(
      "advanced-filter-scape-height-input-min",
    );
    fireEvent.change(scapeHeightMinimum, {
      target: { value: "28" },
    });
    fireEvent.blur(scapeHeightMinimum, { target: { value: "28" } });
    fireEvent.change(screen.getByPlaceholderText("Search parentage"), {
      target: { value: "seedling" },
    });

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(
        urls.some(
          (url) =>
            url.includes("listingTitle=division") &&
            url.includes("scapeHeightMin=28") &&
            url.includes("parentage=seedling"),
        ),
      ).toBe(true);
    });
  });
});
