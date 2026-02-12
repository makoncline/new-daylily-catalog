import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CultivarCatalogListingRow,
  getCultivarListHref,
  getCultivarListingHref,
} from "@/components/cultivar-catalog-listing-row";
import { CultivarCatalogCard } from "@/components/cultivar-catalog-card";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type CultivarPageCatalog = CultivarPageOutput["catalogs"][number];
type CultivarPageCatalogListing = CultivarPageCatalog["cultivarListings"][number];

const listing: CultivarPageCatalogListing = {
  id: "listing-1",
  title: "Coffee Frenzy Prime Fan",
  slug: "coffee-frenzy-prime-fan",
  price: 20,
  description: null,
  updatedAt: new Date("2026-02-11T00:00:00.000Z"),
  imageCount: 2,
  previewImageUrl: null,
  lists: [{ id: "list-show", title: "Show Winners" }],
};

const baseCatalog: CultivarPageCatalog = {
  userId: "user-1",
  slug: "seeded-daylily-farm",
  title: "Seeded Daylily Farm",
  createdAt: new Date("2020-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-11T00:00:00.000Z"),
  description: "Catalog description",
  location: "Picayune Mississippi",
  listingCount: 12,
  listCount: 3,
  hasActiveSubscription: true,
  profileImages: [{ id: "profile-1", url: "/assets/bouquet.png" }],
  cultivarUploadedImageCount: 4,
  cultivarListings: [listing],
};

describe("cultivar catalog links and actions", () => {
  it("builds listing and list links with expected query params", () => {
    expect(getCultivarListingHref("seeded-daylily-farm", "listing-1")).toBe(
      "/seeded-daylily-farm?viewing=listing-1",
    );
    expect(getCultivarListHref("seeded-daylily-farm", "list-show")).toBe(
      "/seeded-daylily-farm?lists=list-show#listings",
    );
  });

  it("renders row links for listing dialog and list jump", () => {
    render(
      <CultivarCatalogListingRow
        sellerSlug="seeded-daylily-farm"
        listing={listing}
      />,
    );

    expect(screen.getByRole("link", { name: "View Listing" })).toHaveAttribute(
      "href",
      "/seeded-daylily-farm?viewing=listing-1",
    );
    expect(screen.getByRole("link", { name: "Show Winners" })).toHaveAttribute(
      "href",
      "/seeded-daylily-farm?lists=list-show#listings",
    );
  });

  it("shows profile image icon only when catalog profile images exist", () => {
    const { rerender } = render(<CultivarCatalogCard catalog={baseCatalog} />);

    expect(screen.getByRole("button", { name: /View 1 image/i })).toBeVisible();

    rerender(
      <CultivarCatalogCard
        catalog={{
          ...baseCatalog,
          profileImages: [],
        }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /View .*image/i }),
    ).not.toBeInTheDocument();
  });
});
