import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogSeoListings } from "@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings";
import { buildPublicProfilePageModel } from "@/app/(public)/[userSlugOrId]/_lib/public-profile-model";
import type { PublicProfilePageData } from "@/app/(public)/[userSlugOrId]/_lib/public-profile-route";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

type FixtureOverrides = {
  forSaleCount?: number;
  page?: number;
  lists?: PublicProfilePageData["profile"]["lists"];
};

function createPublicProfilePageDataFixture(
  overrides: FixtureOverrides = {},
): PublicProfilePageData {
  return {
    profile: {
      id: "user-1",
      slug: "rollingoaksdaylilies",
      title: "Rolling Oaks Daylilies",
      description: "Catalog",
      content: null,
      location: "WA",
      images: [],
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      _count: {
        listings: 2931,
      },
      lists: overrides.lists ?? [
        {
          id: "5",
          title: "General Listing",
          description: "Registered daylilies",
          listingCount: 1610,
        },
        {
          id: "4",
          title: "Kay Cline Seedlings",
          description: "Unregistered seedlings",
          listingCount: 1109,
        },
      ],
      hasActiveSubscription: false,
    },
    items: [],
    page: overrides.page ?? 3,
    pageSize: 100,
    totalCount: 2931,
    totalPages: 245,
    forSaleCount: overrides.forSaleCount ?? 1200,
  };
}

async function createProps(overrides: FixtureOverrides = {}) {
  const model = await buildPublicProfilePageModel(
    createPublicProfilePageDataFixture(overrides),
  );

  return model.listings;
}

describe("CatalogSeoListings", () => {
  it("renders list cards that link to catalog search with list filter", async () => {
    render(<CatalogSeoListings {...(await createProps())} />);

    expect(
      screen.getByRole("link", { name: /General Listing/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=5");
    expect(
      screen.getByRole("link", { name: /Kay Cline Seedlings/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=4");
  });

  it("renders for sale card first in the lists section", async () => {
    render(<CatalogSeoListings {...(await createProps({ forSaleCount: 917 }))} />);

    const listsSection = document.getElementById("lists");
    expect(listsSection).not.toBeNull();
    const listLinks = within(listsSection as HTMLElement).getAllByRole("link");

    expect(listLinks[0]).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/search?price=true",
    );
    expect(within(listLinks[0] as HTMLElement).getByText("For Sale")).toBeVisible();
  });

  it("uses page-only search href for the search CTA", async () => {
    render(<CatalogSeoListings {...(await createProps())} />);

    expect(
      screen.getByRole("link", { name: "Search and filter listings" }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?page=3");
  });

  it("anchors pagination links to listings section", async () => {
    render(<CatalogSeoListings {...(await createProps())} />);

    expect(screen.getByTestId("legacy-page-prev")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=2#listings",
    );
    expect(screen.getByTestId("legacy-page-next")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=4#listings",
    );
    expect(screen.getByTestId("legacy-top-page-prev")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=2#listings",
    );
    expect(screen.getByTestId("legacy-top-page-next")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=4#listings",
    );
  });

  it("renders a for sale card linking to search with sale filter when for sale listings exist", async () => {
    render(
      <CatalogSeoListings
        {...(await createProps({
          forSaleCount: 917,
          lists: [],
          page: 1,
        }))}
      />,
    );

    expect(screen.getByRole("link", { name: /for sale/i })).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/search?price=true",
    );
    expect(screen.getByText("917 listings")).toBeVisible();
  });

  it("does not render a for sale card when no for sale listings exist", async () => {
    render(
      <CatalogSeoListings
        {...(await createProps({
          forSaleCount: 0,
          lists: [],
          page: 1,
        }))}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /for sale/i }),
    ).not.toBeInTheDocument();
  });
});
