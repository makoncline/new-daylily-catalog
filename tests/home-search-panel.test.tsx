import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeSearchPanel } from "@/app/(public)/_components/home-search-panel";
import type { HomeFeaturedCultivar } from "@/types";
import type { PublicProfile } from "@/types/public-types";

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockCultivarSearchUseQuery = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    public: {
      searchCultivars: {
        useQuery: (...args: unknown[]) => mockCultivarSearchUseQuery(...args),
      },
    },
  },
}));

const catalogs: PublicProfile[] = [
  {
    id: "catalog-1",
    title: "Rolling Oaks Daylilies",
    slug: "rolling-oaks",
    description: "Mississippi daylily catalog",
    location: "Mississippi",
    images: [],
    listingCount: 12,
    listCount: 2,
    hasActiveSubscription: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lists: [],
  },
  {
    id: "catalog-2",
    title: "Prairie Bloom Farm",
    slug: "prairie-bloom",
    description: "Colorado catalog",
    location: "Colorado",
    images: [],
    listingCount: 8,
    listCount: 1,
    hasActiveSubscription: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lists: [],
  },
];

const featuredCultivars: HomeFeaturedCultivar[] = [
  {
    id: "cultivar-1",
    name: "Coffee Frenzy",
    normalizedName: "coffee frenzy",
    segment: "coffee-frenzy",
    imageUrl: "https://example.com/coffee.jpg",
    hybridizer: "Reed",
    year: "2012",
    offerCount: 4,
  },
];

describe("HomeSearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCultivarSearchUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("navigates to the best catalog match from local search", async () => {
    render(
      <HomeSearchPanel
        catalogs={catalogs}
        featuredCultivars={featuredCultivars}
      />,
    );

    const catalogsTab = screen.getByRole("tab", { name: "Catalogs" });

    fireEvent.mouseDown(catalogsTab);
    fireEvent.click(catalogsTab);

    const catalogInput = await screen.findByLabelText("Search catalogs");

    fireEvent.change(catalogInput, {
      target: { value: "rolling" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search catalogs" }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/rolling-oaks");
    });
  });

  it("navigates to the first cultivar search result", async () => {
    mockCultivarSearchUseQuery.mockImplementation(
      (input: { query: string }, options: { enabled?: boolean }) => ({
        data:
          options.enabled && input.query === "coffee"
            ? [
                {
                  id: "ahs-1",
                  name: "Coffee Frenzy",
                  cultivarReferenceId: "cultivar-1",
                  normalizedName: "coffee frenzy",
                  segment: "coffee-frenzy",
                },
              ]
            : [],
        isLoading: false,
      }),
    );

    render(
      <HomeSearchPanel
        catalogs={catalogs}
        featuredCultivars={featuredCultivars}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search cultivars"), {
      target: { value: "coffee" },
    });

    await screen.findByRole("button", { name: "Coffee Frenzy" });

    fireEvent.click(screen.getByRole("button", { name: "Search cultivars" }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/cultivar/coffee-frenzy");
    });
  });
});
