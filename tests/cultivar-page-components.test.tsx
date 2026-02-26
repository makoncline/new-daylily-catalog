import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CultivarGallery } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-gallery";
import { CultivarQuickSpecs } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-quick-specs";
import {
  CultivarOfferRow,
  getOfferListHref,
  getOfferViewingHref,
} from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-offer-row";
import { CultivarGardenPhotosSection } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-garden-photos-section";
import { CultivarRelatedSection } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-related-section";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;

type HeroImage = CultivarPageOutput["heroImages"][number];
type QuickSpec = CultivarPageOutput["quickSpecs"]["all"][number];
type Offer = CultivarPageOutput["offers"]["gardenCards"][number]["offers"][number];
type RelatedCultivar = CultivarPageOutput["relatedByHybridizer"][number];

describe("cultivar page components", () => {
  beforeEach(() => {
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn() },
        configurable: true,
      });
    }

    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  });

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
        alt: "Coffee Frenzy alternate image",
        source: "ahs",
        listingId: null,
        sellerSlug: null,
        sellerTitle: null,
      },
    ];

    render(<CultivarGallery images={images} cultivarName="Coffee Frenzy" />);

    expect(screen.getAllByRole("img", { name: /AHS image/i })[0]).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /alternate image/i }));

    expect(screen.getAllByRole("img", { name: /alternate image/i })[0]).toBeVisible();
  });

  it("expands quick specs and copy includes summary details + all fields", async () => {
    const topSpecs: QuickSpec[] = [
      { label: "Bloom Season", value: "Midseason" },
      { label: "Ploidy", value: "Tet" },
    ];

    const allSpecs: QuickSpec[] = [
      ...topSpecs,
      { label: "Fragrance", value: "Light" },
      { label: "Branches", value: "5" },
    ];

    render(
      <CultivarQuickSpecs
        cultivarName="Coffee Frenzy"
        hybridizer="Reed"
        year="2012"
        topSpecs={topSpecs}
        allSpecs={allSpecs}
      />,
    );

    expect(screen.queryByText("Fragrance")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show all specs/i }));

    expect(screen.getByText("Fragrance")).toBeVisible();
    expect(screen.getByText("Branches")).toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy specs/i }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Name: Coffee Frenzy"),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Hybridizer: Reed"),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Year: 2012"),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Fragrance: Light"),
    );
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
    expect(screen.queryByRole("link", { name: /contact/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/add to cart/i)).not.toBeInTheDocument();
  });

  it("renders related cultivar links as nofollow", () => {
    const relatedCultivar: RelatedCultivar = {
      segment: "isle-of-wight",
      normalizedName: "isle of wight",
      name: "Isle of Wight",
      hybridizer: "Reed",
      year: "2007",
      imageUrl: "/assets/hero-garden.webp",
      ahsListing: {
        id: "ahs-isle",
        name: "Isle of Wight",
        ahsImageUrl: "/assets/hero-garden.webp",
        hybridizer: "Reed",
        year: "2007",
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
      },
    };

    render(
      <CultivarRelatedSection
        relatedCultivars={[relatedCultivar]}
        hybridizer="Reed"
      />,
    );

    const relatedLink = screen.getByRole("link", { name: /isle of wight/i });
    expect(relatedLink).toHaveAttribute("href", "/cultivar/isle-of-wight");
    expect(relatedLink).toHaveAttribute("rel", "nofollow");
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

    expect(screen.getByRole("heading", { level: 2, name: /photos in catalogs/i })).toBeVisible();
    expect(screen.queryByText(/add a photo/i)).not.toBeInTheDocument();
  });
});
