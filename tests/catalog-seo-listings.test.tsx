import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogSeoListings } from "@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings";

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
        searchQueryString=""
      />,
    );

    expect(screen.getByRole("link", { name: /General Listing/i })).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/catalog?lists=5",
    );
    expect(screen.getByRole("link", { name: /Kay Cline Seedlings/i })).toHaveAttribute(
      "href",
      "/rollingoaksdaylilies/catalog?lists=4",
    );
  });
});
