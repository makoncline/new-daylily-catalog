import { describe, expect, it } from "vitest";
import {
  getFilteredGardenOffers,
  type OfferFilters,
} from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-offers-utils";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type OfferGardenCard = CultivarPageOutput["offers"]["gardenCards"][number];

const gardenCards: OfferGardenCard[] = [
  {
    userId: "user-a",
    slug: "alpha-garden",
    title: "Alpha Garden",
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-12T00:00:00.000Z"),
    description: null,
    location: null,
    listingCount: 20,
    listCount: 3,
    hasActiveSubscription: true,
    profileImages: [],
    offers: [
      {
        id: "alpha-sale",
        title: "Alpha Sale",
        slug: "alpha-sale",
        price: 20,
        description: null,
        updatedAt: new Date("2026-01-11T00:00:00.000Z"),
        imageCount: 1,
        previewImageUrl: "/assets/a.jpg",
        lists: [],
      },
      {
        id: "alpha-not-sale",
        title: "Alpha Not Sale",
        slug: "alpha-not-sale",
        price: null,
        description: null,
        updatedAt: new Date("2026-01-15T00:00:00.000Z"),
        imageCount: 5,
        previewImageUrl: "/assets/a2.jpg",
        lists: [],
      },
    ],
  },
  {
    userId: "user-b",
    slug: "beta-garden",
    title: "Beta Garden",
    createdAt: new Date("2021-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-20T00:00:00.000Z"),
    description: null,
    location: null,
    listingCount: 11,
    listCount: 2,
    hasActiveSubscription: true,
    profileImages: [],
    offers: [
      {
        id: "beta-sale",
        title: "Beta Sale",
        slug: "beta-sale",
        price: 35,
        description: null,
        updatedAt: new Date("2026-01-10T00:00:00.000Z"),
        imageCount: 3,
        previewImageUrl: "/assets/b.jpg",
        lists: [],
      },
    ],
  },
];

function makeFilters(overrides: Partial<OfferFilters> = {}): OfferFilters {
  return {
    sort: "best-match",
    forSaleOnly: false,
    hasPhotoOnly: false,
    ...overrides,
  };
}

describe("getFilteredGardenOffers", () => {
  it("applies best-match ordering for listings inside each garden", () => {
    const result = getFilteredGardenOffers(gardenCards, makeFilters());

    expect(result.gardens[0]?.offers[0]?.id).toBe("beta-sale");
    expect(result.gardens[1]?.offers.map((offer) => offer.id)).toEqual([
      "alpha-sale",
      "alpha-not-sale",
    ]);
  });

  it("sorts by price ascending when selected", () => {
    const result = getFilteredGardenOffers(
      gardenCards,
      makeFilters({ sort: "price-asc" }),
    );

    expect(result.gardens.map((garden) => garden.slug)).toEqual([
      "alpha-garden",
      "beta-garden",
    ]);
  });

  it("filters out non-sale and imageless offers", () => {
    const result = getFilteredGardenOffers(
      gardenCards,
      makeFilters({
        forSaleOnly: true,
        hasPhotoOnly: true,
      }),
    );

    expect(result.offersCount).toBe(2);
    expect(
      result.gardens.flatMap((garden) => garden.offers.map((offer) => offer.id)),
    ).toEqual(["beta-sale", "alpha-sale"]);
  });
});
