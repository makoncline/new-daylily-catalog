import { render, screen, within } from "@testing-library/react";
import { type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CatalogSeoListings } from "@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings";
import { type RouterOutputs } from "@/trpc/react";

vi.mock("next/link", () => ({
  default: ({
    prefetch,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={String(prefetch)} />
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({
    userSlugOrId: "rollingoaksdaylilies",
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-listing-dialog-query-state", () => ({
  useListingDialogQueryState: () => ({
    viewingId: null,
    closeListing: vi.fn(),
  }),
}));

type Listing = RouterOutputs["public"]["getListings"][number];

function createListing(id: string, title: string, slug: string): Listing {
  return {
    id,
    title,
    slug,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    description: null,
    price: null,
    userId: "user-1",
    user: {
      profile: {
        slug: "rollingoaksdaylilies",
        title: "Rolling Oaks Daylilies",
      },
    },
    userSlug: "rollingoaksdaylilies",
    sellerTitle: "Rolling Oaks Daylilies",
    lists: [],
    images: [],
    ahsListing: null,
    cultivarReference: null,
    cultivarReferenceImage: null,
  } as unknown as Listing;
}

describe("CatalogSeoListings", () => {
  it("renders canonical listing links with an ID fallback", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[
          createListing("listing-1", "A Green Desire", "a-green-desire"),
          createListing("listing-2", "Seedling 24-7", ""),
        ]}
        profileLists={[]}
        page={1}
        totalPages={1}
        totalCount={2}
        forSaleCount={0}
      />,
    );

    expect(
      screen.getByRole("link", { name: "View A Green Desire" }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/a-green-desire");
    expect(
      screen.getByRole("link", { name: "View Seedling 24-7" }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/listing-2");
  });

  it("renders list cards that link to catalog search with list filter", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[
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
        ]}
        page={1}
        totalPages={245}
        totalCount={2931}
        forSaleCount={1200}
      />,
    );

    expect(
      screen.getByRole("link", { name: /General Listing/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=5");
    expect(
      screen.getByRole("link", { name: /General Listing/i }),
    ).toHaveAttribute("data-prefetch", "false");
    expect(
      screen.getByRole("link", { name: /Kay Cline Seedlings/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=4");
  });

  it("renders for sale card first in the lists section", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[
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
        ]}
        page={1}
        totalPages={245}
        totalCount={2931}
        forSaleCount={917}
      />,
    );

    const listsSection = document.getElementById("lists");
    expect(listsSection).not.toBeNull();
    const listLinks = within(listsSection!).getAllByRole("link");

    expect(listLinks[0]).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/search?price=true",
    );
    expect(within(listLinks[0]!).getByText("For Sale")).toBeVisible();
  });

  it("uses page-only search href for the search CTA", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[]}
        page={3}
        totalPages={245}
        totalCount={2931}
        forSaleCount={1200}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Search and filter listings" }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?page=3");
    expect(
      screen.getByRole("link", { name: "Search and filter listings" }),
    ).toHaveAttribute("data-prefetch", "false");
  });

  it("anchors pagination links to listings section", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[]}
        page={3}
        totalPages={245}
        totalCount={2931}
        forSaleCount={1200}
      />,
    );

    expect(screen.getByTestId("legacy-page-prev")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/page/2#listings",
    );
    expect(screen.getByTestId("legacy-page-next")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/page/4#listings",
    );
    expect(screen.getByTestId("legacy-page-next")).toHaveAttribute(
      "data-prefetch",
      "false",
    );
    expect(screen.getByTestId("legacy-top-page-prev")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/page/2#listings",
    );
    expect(screen.getByTestId("legacy-top-page-next")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/page/4#listings",
    );
  });

  it("renders a for sale card linking to search with sale filter when for sale listings exist", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[]}
        page={1}
        totalPages={245}
        totalCount={2931}
        forSaleCount={917}
      />,
    );

    expect(screen.getByRole("link", { name: /for sale/i })).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/search?price=true",
    );
    expect(screen.getByText("917 listings")).toBeVisible();
  });

  it("does not render a for sale card when no for sale listings exist", () => {
    render(
      <CatalogSeoListings
        canonicalUserSlug="rollingoaksdaylilies"
        listings={[]}
        profileLists={[]}
        page={1}
        totalPages={245}
        totalCount={2931}
        forSaleCount={0}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /for sale/i }),
    ).not.toBeInTheDocument();
  });
});
