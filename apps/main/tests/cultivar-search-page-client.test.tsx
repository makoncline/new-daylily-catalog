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

function searchResponseFor(args: {
  cultivarReferenceId: string;
  name: string;
  nextOffset?: number | null;
}) {
  const response = searchResponse();
  const result = response.results[0];
  if (!result) throw new Error("Expected seeded cultivar search result.");

  return {
    ...response,
    pagination: {
      ...response.pagination,
      hasMore: args.nextOffset !== null && args.nextOffset !== undefined,
      nextOffset: args.nextOffset ?? null,
    },
    results: [
      {
        ...result,
        canonicalUrl: `https://daylilycatalog.com/cultivar/${args.cultivarReferenceId}`,
        cultivarReferenceId: args.cultivarReferenceId,
        name: args.name,
        normalizedName: args.name.toLowerCase(),
      },
    ],
  };
}

describe("CultivarSearchPageClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
    });
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("searches the compact public index and applies cultivar-photo filters", async () => {
    window.history.replaceState(
      {},
      "",
      "/cultivars?form=Spider%7CDouble%7CSpider&hasPhoto=true&listingDescription=division&listingTitle=sale&priceMax=286&priceMin=10&q=Stella+de+Oro",
    );

    render(
      <CultivarSearchPageClient
        initialState={{
          hasCultivarPhoto: false,
          hasForSaleListings: false,
          hasListings: false,
          form: "Spider|Double|Spider",
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
    expect(
      screen.queryByText("Early Mid · Single · Diploid"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("3 catalogs")).not.toBeInTheDocument();
    expect(screen.queryByText("Open →")).not.toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/v1/cultivars/search?form=Double%7CSpider&limit=24&mode=summary&offset=0&photosFirst=true&q=Stella+de+Oro&sort=relevance",
    );
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/cultivars?advanced=true&form=Double%7CSpider&q=Stella+de+Oro",
    );
    expect(screen.getByRole("switch", { name: "Advanced" })).toBeChecked();
    expect(screen.getByTestId("advanced-filter-form")).toHaveTextContent(
      "2 selected",
    );
    expect(screen.getByTestId("active-filter-chips")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Search: Stella de Oro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Form: Double, Spider" }),
    ).toBeVisible();
    expect(screen.queryByText(/Price:/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Form: Double, Spider" }),
    );

    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain("form=");
      expect(window.location.search).not.toContain("form=");
    });
    expect(
      screen.queryByRole("button", { name: "Form: Double, Spider" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "With photos" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("hasCultivarPhoto=true"),
        ),
      ).toBe(true);
    });

    expect(screen.getByRole("group", { name: "Sort cultivars" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Best match" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Photos first" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Newest introductions" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Photos first" }));

    await waitFor(() => {
      const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(lastUrl).toContain("sort=newest");
      expect(lastUrl).toContain("photosFirst=false");
    });
    expect(`${window.location.pathname}${window.location.search}`).toContain(
      "photosFirst=false",
    );
    expect(`${window.location.pathname}${window.location.search}`).toContain(
      "sort=newest",
    );
  });

  it("exposes cultivar-focused advanced filters and sends their values", async () => {
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

    expect(screen.queryByText("Listing")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search listing title"),
    ).not.toBeInTheDocument();
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
            url.includes("scapeHeightMin=28") &&
            url.includes("parentage=seedling"),
        ),
      ).toBe(true);
    });
  });

  it("does not append an old pagination response after filters change", async () => {
    let resolveOldPage:
      | ((value: { json: () => Promise<unknown>; ok: boolean }) => void)
      | undefined;
    const oldPageResponse = new Promise<{
      json: () => Promise<unknown>;
      ok: boolean;
    }>((resolve) => {
      resolveOldPage = resolve;
    });

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("offset=24")) return oldPageResponse;
      const response = url.includes("hasCultivarPhoto=true")
        ? searchResponseFor({
            cultivarReferenceId: "filtered",
            name: "Filtered cultivar",
          })
        : searchResponseFor({
            cultivarReferenceId: "first-page",
            name: "First page cultivar",
            nextOffset: 24,
          });

      return Promise.resolve({ json: async () => response, ok: true });
    });

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

    await screen.findByRole("heading", { name: "First page cultivar" });

    fireEvent.click(
      screen.getByRole("button", { name: "Load more cultivars" }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes("offset=24")),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: "With photos" }));
    await screen.findByRole("heading", { name: "Filtered cultivar" });

    const oldPageJsonMock = vi.fn(async () =>
      searchResponseFor({
        cultivarReferenceId: "old-page",
        name: "Old page cultivar",
      }),
    );
    resolveOldPage?.({
      json: oldPageJsonMock,
      ok: true,
    });

    await waitFor(() => expect(oldPageJsonMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("heading", { name: "Old page cultivar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Filtered cultivar" }),
    ).toBeVisible();
  });

  it("restores loaded pages only when returning to the same history entry", async () => {
    const scrollToMock = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 742,
    });

    fetchMock.mockImplementation((url: string) => {
      const response = url.includes("offset=24")
        ? searchResponseFor({
            cultivarReferenceId: "second-page",
            name: "Second page cultivar",
          })
        : searchResponseFor({
            cultivarReferenceId: "first-page",
            name: "First page cultivar",
            nextOffset: 24,
          });

      return Promise.resolve({ json: async () => response, ok: true });
    });

    const firstRender = render(
      <CultivarSearchPageClient
        initialState={{
          hasCultivarPhoto: false,
          hasForSaleListings: false,
          hasListings: false,
          q: "",
        }}
      />,
    );

    await screen.findByRole("heading", { name: "First page cultivar" });

    fireEvent.change(
      screen.getByPlaceholderText(
        "Search by cultivar name, hybridizer, or color…",
      ),
      { target: { value: "Back Search" } },
    );
    fireEvent.click(screen.getByRole("switch", { name: "Advanced" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Newest introductions" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Photos first" }));

    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe(
        "/cultivars?advanced=true&photosFirst=false&q=Back+Search&sort=newest",
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Load more cultivars" }),
    );
    await screen.findByRole("heading", { name: "Second page cultivar" });
    const resultLink = screen.getByRole("link", {
      name: /Second page cultivar/,
    });
    resultLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(resultLink);

    const searchEntryState = window.history.state;
    firstRender.unmount();
    fetchMock.mockClear();

    const restoredRender = render(
      <CultivarSearchPageClient
        initialState={{
          hasCultivarPhoto: false,
          hasForSaleListings: false,
          hasListings: false,
          q: "",
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Second page cultivar" }),
    ).toBeVisible();
    expect(
      screen.getByPlaceholderText(
        "Search by cultivar name, hybridizer, or color…",
      ),
    ).toHaveValue("Back Search");
    expect(screen.getByRole("switch", { name: "Advanced" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Newest introductions" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Photos first" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(scrollToMock).toHaveBeenCalledWith({
        behavior: "instant",
        top: 742,
      }),
    );

    restoredRender.unmount();
    window.history.replaceState({}, "", "/cultivars");
    expect(window.history.state).not.toEqual(searchEntryState);
    fetchMock.mockClear();

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

    await screen.findByRole("heading", { name: "First page cultivar" });
    expect(
      screen.queryByRole("heading", { name: "Second page cultivar" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
