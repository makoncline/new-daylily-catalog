import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CultivarGallery } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-gallery";
import { CultivarQuickSpecs } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-quick-specs";
import {
  CultivarOfferRow,
  getOfferListHref,
  getOfferViewingHref,
} from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-offer-row";
import { CultivarGardenPhotosSection } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-garden-photos-section";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;

type HeroImage = CultivarPageOutput["heroImages"][number];
type QuickSpec = CultivarPageOutput["quickSpecs"]["all"][number];
type Offer = CultivarPageOutput["offers"]["gardenCards"][number]["offers"][number];

describe("cultivar page components", () => {
  it("swaps the hero image when a thumbnail is clicked", () => {
    const images: HeroImage[] = [
      {
        id: "hero-1",
        url: "/assets/catalog-blooms.webp",
        alt: "Coffee Frenzy AHS image",
        source: "ahs",
        listingId: null,
        sellerSlug: null,
        sellerTitle: null,
      },
      {
        id: "hero-2",
        url: "/assets/bouquet.png",
        alt: "Coffee Frenzy listing image",
        source: "listing",
        listingId: "listing-1",
        sellerSlug: "seeded-daylily",
        sellerTitle: "Seeded Daylily",
      },
    ];

    render(<CultivarGallery images={images} cultivarName="Coffee Frenzy" />);

    expect(screen.getAllByRole("img", { name: /AHS image/i })[0]).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /listing image/i }));

    expect(screen.getAllByRole("img", { name: /listing image/i })[0]).toBeVisible();
  });

  it("expands quick specs to show all fields", () => {
    const topSpecs: QuickSpec[] = [
      { label: "Bloom Season", value: "Midseason" },
      { label: "Ploidy", value: "Tet" },
    ];

    const allSpecs: QuickSpec[] = [
      ...topSpecs,
      { label: "Fragrance", value: "Light" },
      { label: "Branches", value: "5" },
    ];

    render(<CultivarQuickSpecs topSpecs={topSpecs} allSpecs={allSpecs} />);

    expect(screen.queryByText("Fragrance")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show all specs/i }));

    expect(screen.getByText("Fragrance")).toBeVisible();
    expect(screen.getByText("Branches")).toBeVisible();
  });

  it("builds offer links and does not render add-to-cart controls", () => {
    expect(getOfferViewingHref("seeded-daylily", "listing-1")).toBe(
      "/seeded-daylily?viewing=listing-1",
    );
    expect(getOfferListHref("seeded-daylily", "list-1")).toBe(
      "/seeded-daylily?lists=list-1#listings",
    );

    const offer: Offer = {
      id: "listing-1",
      title: "Coffee Frenzy Prime Fan",
      slug: "coffee-frenzy-prime-fan",
      price: 30,
      description: null,
      updatedAt: new Date("2026-02-11T00:00:00.000Z"),
      imageCount: 1,
      previewImageUrl: "/assets/bouquet.png",
      lists: [{ id: "list-1", title: "Show Winners" }],
    };

    render(<CultivarOfferRow sellerSlug="seeded-daylily" offer={offer} />);

    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      "/seeded-daylily?viewing=listing-1",
    );
    expect(screen.getByRole("link", { name: "Show Winners" })).toHaveAttribute(
      "href",
      "/seeded-daylily?lists=list-1#listings",
    );
    expect(screen.queryByText(/add to cart/i)).not.toBeInTheDocument();
  });

  it("renders garden photos without a public add-photo CTA", () => {
    render(
      <CultivarGardenPhotosSection
        photos={[
          {
            id: "photo-1",
            url: "/assets/bouquet.png",
            listingId: "listing-1",
            listingTitle: "Coffee Frenzy Prime Fan",
            sellerSlug: "seeded-daylily",
            sellerTitle: "Seeded Daylily",
            updatedAt: new Date("2026-02-11T00:00:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: /photos in gardens/i })).toBeVisible();
    expect(screen.queryByText(/add a photo/i)).not.toBeInTheDocument();
  });
});
