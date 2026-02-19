import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogSeoListings } from "@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("CatalogSeoListings", () => {
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
      />,
    );

    expect(
      screen.getByRole("link", { name: /General Listing/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=5");
    expect(
      screen.getByRole("link", { name: /Kay Cline Seedlings/i }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?lists=4");
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
      />,
    );

    expect(
      screen.getByRole("link", { name: "Search and filter listings" }),
    ).toHaveAttribute("href", "/rollingoaksdaylilies/search?page=3");
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
      />,
    );

    expect(screen.getByTestId("legacy-page-prev")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=2#listings",
    );
    expect(screen.getByTestId("legacy-page-next")).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies?page=4#listings",
    );
  });
});
