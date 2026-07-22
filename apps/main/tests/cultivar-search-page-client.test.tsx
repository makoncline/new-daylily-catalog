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
          awards: [
            {
              name: "HM",
              url: "https://daylilies.org/award/honorable-mention/",
              year: "1980",
            },
          ],
          bloomHabit: "Diurnal",
          bloomSeason: "Early Mid",
          bloomSizeIn: 2.75,
          branches: 3,
          budCount: 18,
          color: "gold with a deeper throat",
          doublePercentage: null,
          foliageType: "Dormant",
          flowerShow: "Miniature",
          form: "Single",
          fragrance: "Fragrant",
          hybridizer: "Jablonski",
          parentage: "(Tiny Gold × Golden Star)",
          petalLengthIn: null,
          petalWidthIn: null,
          ploidy: "Diploid",
          polymerousPercentage: null,
          rebloom: true,
          scapeHeightIn: 11,
          seedlingNumber: "J-75",
          spiderRatio: null,
          sculptedTypes: "Pleated",
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
    capturePosthogEventMock.mockClear();
    fetchMock.mockResolvedValue({
      headers: new Headers(),
      json: async () => searchResponse(),
      ok: true,
      status: 200,
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
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show full details for Stella de Oro",
      }),
    );
    expect(screen.getByText("(Jablonski, 1975)")).toBeVisible();
    expect(screen.getByText("Miniature")).toBeVisible();
    expect(screen.getByText("Pleated")).toBeVisible();
    expect(screen.getByText("J-75")).toBeVisible();
    expect(screen.getByText("(Tiny Gold × Golden Star)")).toBeVisible();
    expect(screen.getByRole("link", { name: "HM · 1980" })).toHaveAttribute(
      "href",
      "https://daylilies.org/award/honorable-mention/",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show full details for Stella de Oro",
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/v1/cultivars/search?form=Double%7CSpider&hasListings=true&limit=24&mode=summary&offset=0&q=Stella+de+Oro&sort=name",
    );
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/cultivars?advanced=true&form=Double%7CSpider&q=Stella+de+Oro",
    );
    expect(screen.getByRole("switch", { name: "Advanced" })).toBeChecked();
    expect(screen.getByTestId("advanced-filter-form")).toHaveTextContent(
      "2 selected",
    );
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "public_cultivar_search_results_viewed",
      expect.objectContaining({
        active_filters: "form|has_listings",
        client_duration_ms: expect.any(Number),
        filter_count: 2,
        form: "double|spider",
        has_listings: true,
        has_more: false,
        http_status: 200,
        outcome: "results",
        query: "stella de oro",
        query_kind: "query_and_filters",
        request_kind: "initial",
        results_returned: 1,
        visible_result_count: 1,
      }),
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
    const inCatalogs = screen.getByTestId("advanced-filter-linked-to-cultivar");
    const withPhotos = screen.getByTestId("cultivar-filter-has-photo");
    expect(inCatalogs).toHaveAttribute("aria-pressed", "true");
    expect(
      inCatalogs.compareDocumentPosition(withPhotos) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(inCatalogs);
    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
        "hasListings=false",
      );
      expect(window.location.search).toContain("hasListings=false");
    });
    expect(screen.getByRole("button", { name: "Name A–Z" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "Photos first" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Newest introductions" }),
    );
    await waitFor(() => {
      const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(lastUrl).toContain("sort=newest");
    });
    expect(`${window.location.pathname}${window.location.search}`).toContain(
      "sort=newest",
    );
  });

  it("exposes cultivar-focused advanced filters and sends their values", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/v1/cultivars/facets")) {
        const options = url.includes("facet=flowerShow")
          ? [{ count: 62779, label: "Large", value: "Large" }]
          : url.includes("facet=sculptedType")
            ? [{ count: 492, label: "Cristate", value: "Cristate" }]
            : [
                { count: 24, label: "Reed", value: "Reed" },
                { count: 12, label: "Stone", value: "Stone" },
              ];
        return Promise.resolve({
          json: async () => ({ options }),
          ok: true,
          status: 200,
        });
      }

      return Promise.resolve({
        headers: new Headers(),
        json: async () => searchResponse(),
        ok: true,
        status: 200,
      });
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
    expect(screen.getByTestId("advanced-filter-award")).toBeVisible();
    expect(screen.getByTestId("advanced-filter-flower-show")).toBeVisible();
    expect(screen.getByTestId("advanced-filter-sculpted-type")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Flower Show" }));
    fireEvent.click(await screen.findByText("Large"));
    fireEvent.click(screen.getByRole("button", { name: "Sculpted type" }));
    fireEvent.click(await screen.findByText("Cristate"));

    fireEvent.click(screen.getByRole("button", { name: "Hybridizer" }));
    fireEvent.change(screen.getByPlaceholderText("Search hybridizer…"), {
      target: { value: "Re" },
    });
    fireEvent.click(await screen.findByText("Reed"));
    fireEvent.click(screen.getByText("Stone"));

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
            url.includes("parentage=seedling") &&
            url.includes("hybridizer=Reed%7CStone") &&
            url.includes("flowerShow=Large") &&
            url.includes("sculptedType=Cristate"),
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
        "Search names, hybridizers, colors, awards, or parentage…",
      ),
      { target: { value: "Back Search" } },
    );
    fireEvent.click(screen.getByRole("switch", { name: "Advanced" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Newest introductions" }),
    );
    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe(
        "/cultivars?advanced=true&q=Back+Search&sort=newest",
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Load more cultivars" }),
    );
    await screen.findByRole("heading", { name: "Second page cultivar" });
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "public_cultivar_search_results_viewed",
      expect.objectContaining({
        request_kind: "load_more",
        results_returned: 1,
        visible_result_count: 2,
      }),
    );
    const resultLink = screen.getByRole("link", {
      name: /Second page cultivar/,
    });
    resultLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(resultLink);

    const searchEntryState = window.history.state;
    firstRender.unmount();
    fetchMock.mockClear();
    capturePosthogEventMock.mockClear();

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
        "Search names, hybridizers, colors, awards, or parentage…",
      ),
    ).toHaveValue("Back Search");
    expect(screen.getByRole("switch", { name: "Advanced" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Newest introductions" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: "Photos first" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(capturePosthogEventMock).not.toHaveBeenCalled();
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
