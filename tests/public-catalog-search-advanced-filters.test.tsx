import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogSearchContent } from "@/components/public-catalog-search/public-catalog-search-content";
import {
  type PublicCatalogListing,
  type PublicCatalogLists,
} from "@/components/public-catalog-search/public-catalog-search-types";

const navigationState = vi.hoisted(() => {
  let pathname = "/seeded-daylily/search";
  let params = new URLSearchParams();

  const applyHref = (href: string, method: "push" | "replace") => {
    const url = href.startsWith("http")
      ? new URL(href)
      : new URL(href, "https://example.test");

    pathname = url.pathname;
    params = new URLSearchParams(url.search);

    if (typeof window !== "undefined") {
      const nextLocation = `${url.pathname}${url.search}${url.hash}`;
      if (method === "replace") {
        window.history.replaceState(null, "", nextLocation);
      } else {
        window.history.pushState(null, "", nextLocation);
      }
    }
  };

  return {
    reset: () => {
      pathname = "/seeded-daylily/search";
      params = new URLSearchParams();
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", pathname);
      }
    },
    getPathname: () => pathname,
    getParams: () => params,
    router: {
      push: vi.fn((href: string) => {
        applyHref(href, "push");
      }),
      replace: vi.fn((href: string) => {
        applyHref(href, "replace");
      }),
    },
  };
});

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

if (!HTMLElement.prototype.scrollIntoView) {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: () => undefined,
    writable: true,
  });
}

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.getPathname(),
  useRouter: () => navigationState.router,
  useSearchParams: () => ({
    get: (key: string) => navigationState.getParams().get(key),
    toString: () => navigationState.getParams().toString(),
  }),
}));

vi.mock("@/components/public-catalog-search/public-catalog-search-table", () => ({
  PublicCatalogSearchTable: ({
    table,
  }: {
    table: {
      getRowModel: () => {
        rows: Array<{ id: string; original: { title: string } }>;
      };
    };
  }) => (
    <ul data-testid="catalog-table">
      {table.getRowModel().rows.map((row) => (
        <li key={row.id}>{row.original.title}</li>
      ))}
    </ul>
  ),
}));

vi.mock("@/components/data-table/data-table-pagination", () => ({
  DataTablePagination: () => <div data-testid="catalog-pagination" />,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/no-results", () => ({
  NoResults: ({ filtered = false }: { filtered?: boolean }) => (
    <div data-testid="no-results">
      {filtered ? "No listings found" : "No listings"}
    </div>
  ),
}));

interface MockAhsListing {
  name: string | null;
  ahsImageUrl: string | null;
  hybridizer: string | null;
  year: string | null;
  scapeHeight: string | null;
  bloomSize: string | null;
  bloomSeason: string | null;
  form: string | null;
  ploidy: string | null;
  foliageType: string | null;
  bloomHabit: string | null;
  budcount: string | null;
  branches: string | null;
  sculpting: string | null;
  foliage: string | null;
  flower: string | null;
  fragrance: string | null;
  parentage: string | null;
  color: string | null;
}

const defaultAhsListing: MockAhsListing = {
  name: null,
  ahsImageUrl: null,
  hybridizer: null,
  year: null,
  scapeHeight: null,
  bloomSize: null,
  bloomSeason: null,
  form: null,
  ploidy: null,
  foliageType: null,
  bloomHabit: null,
  budcount: null,
  branches: null,
  sculpting: null,
  foliage: null,
  flower: null,
  fragrance: null,
  parentage: null,
  color: null,
};

function createListing(args: {
  id: string;
  title: string;
  price: number | null;
  listId: string;
  listTitle: string;
  imageCount: number;
  ahs: Partial<MockAhsListing>;
}): PublicCatalogListing {
  return {
    id: args.id,
    title: args.title,
    slug: `${args.title.toLowerCase().replace(/\s+/g, "-")}-${args.id}`,
    description: `${args.title} description`,
    price: args.price,
    userId: "user-1",
    user: {
      profile: {
        slug: "seeded-daylily",
        title: "Seeded Daylily",
      },
    },
    lists: [
      {
        id: args.listId,
        title: args.listTitle,
      },
    ],
    cultivarReference: {
      normalizedName: null,
      ahsListing: null,
    },
    images: Array.from({ length: args.imageCount }, (_, index) => ({
      id: `${args.id}-img-${index}`,
      url: `/img/${args.id}-${index}.jpg`,
    })),
    ahsListing: {
      ...defaultAhsListing,
      ...args.ahs,
    },
  } as PublicCatalogListing;
}

const lists: PublicCatalogLists = [
  {
    id: "list-featured",
    title: "Featured Picks",
    description: null,
    listingCount: 1,
  },
  {
    id: "list-garden",
    title: "Garden Collection",
    description: null,
    listingCount: 2,
  },
];

const listings: PublicCatalogListing[] = [
  createListing({
    id: "listing-alpha",
    title: "Alpha Rose",
    price: 20,
    listId: "list-featured",
    listTitle: "Featured Picks",
    imageCount: 1,
    ahs: {
      hybridizer: "Reed",
      year: "2012",
      bloomSeason: "Midseason",
      ploidy: "Tet",
      scapeHeight: "36 inches",
      color: "Rose pink",
      parentage: "(A x B)",
    },
  }),
  createListing({
    id: "listing-beta",
    title: "Beta Gold",
    price: null,
    listId: "list-garden",
    listTitle: "Garden Collection",
    imageCount: 0,
    ahs: {
      hybridizer: "Stone",
      year: "2001",
      bloomSeason: "Early",
      ploidy: "Dip",
      scapeHeight: "28 inches",
      color: "Gold",
      parentage: "(C x D)",
    },
  }),
  createListing({
    id: "listing-gamma",
    title: "Gamma Peach",
    price: 18,
    listId: "list-garden",
    listTitle: "Garden Collection",
    imageCount: 1,
    ahs: {
      hybridizer: "Reed",
      year: "2018",
      bloomSeason: "Late",
      ploidy: "Tet",
      scapeHeight: "40 inches",
      color: "Peach",
      parentage: "(E x F)",
    },
  }),
];

describe("public catalog search advanced filters", () => {
  beforeEach(() => {
    navigationState.reset();
    vi.clearAllMocks();
  });

  it("switches to advanced mode and applies live facet/text/range filters", async () => {
    const { rerender } = render(
      <PublicCatalogSearchContent
        lists={lists}
        listings={listings}
        isLoading={false}
        totalListingsCount={3}
      />,
    );

    fireEvent.click(screen.getByTestId("search-mode-switch"));

    await waitFor(() => {
      expect(navigationState.router.replace).toHaveBeenCalled();
      expect(navigationState.getParams().get("mode")).toBe("advanced");
    });

    rerender(
      <PublicCatalogSearchContent
        lists={lists}
        listings={listings}
        isLoading={false}
        totalListingsCount={3}
      />,
    );

    expect(screen.getByTestId("advanced-search-panel")).toBeVisible();

    fireEvent.click(screen.getByTestId("advanced-filter-for-sale"));
    fireEvent.click(screen.getByTestId("advanced-filter-has-photo"));

    fireEvent.click(
      within(screen.getByTestId("advanced-filter-lists")).getByRole("button", {
        name: /lists/i,
      }),
    );
    fireEvent.click(screen.getByText("Featured Picks"));

    fireEvent.click(screen.getByRole("button", { name: /registration/i }));
    fireEvent.change(screen.getByTestId("advanced-filter-hybridizer"), {
      target: { value: "Reed" },
    });
    fireEvent.keyDown(screen.getByTestId("advanced-filter-year-thumb-min"), {
      key: "ArrowRight",
      code: "ArrowRight",
    });

    fireEvent.click(screen.getByRole("button", { name: /bloom traits/i }));
    fireEvent.click(
      within(screen.getByTestId("advanced-filter-bloom-season")).getByRole(
        "button",
        {
          name: /bloom season/i,
        },
      ),
    );
    fireEvent.click(screen.getByText("Midseason"));

    fireEvent.click(screen.getByRole("button", { name: /classification/i }));
    fireEvent.click(
      within(screen.getByTestId("advanced-filter-ploidy")).getByRole("button", {
        name: /ploidy/i,
      }),
    );
    fireEvent.click(screen.getByText("Tet"));

    fireEvent.change(screen.getByTestId("advanced-filter-color"), {
      target: { value: "Rose" },
    });
    fireEvent.change(screen.getByTestId("advanced-filter-parentage"), {
      target: { value: "A x B" },
    });

    await waitFor(() => {
      expect(within(screen.getByTestId("catalog-table")).getAllByRole("listitem")).toHaveLength(1);
    });

    expect(screen.getByText("Alpha Rose")).toBeVisible();
    expect(screen.queryByText("Beta Gold")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Peach")).not.toBeInTheDocument();

    await waitFor(() => {
      const params = navigationState.getParams();

      expect(params.get("mode")).toBe("advanced");
      expect(params.get("price")).toBe("true");
      expect(params.get("hasPhoto")).toBe("true");
      expect(params.get("hybridizer")).toBe("Reed");
      expect(params.get("year")).not.toBeNull();
      expect(params.get("lists")).toBe("list-featured");
      expect(params.get("bloomSeason")).toBe("Midseason");
      expect(params.get("ploidy")).toBe("Tet");
      expect(params.get("color")).toBe("Rose");
      expect(params.get("parentage")).toBe("A x B");
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(within(screen.getByTestId("catalog-table")).getAllByRole("listitem")).toHaveLength(3);
    });
  });
});
