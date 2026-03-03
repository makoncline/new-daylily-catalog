import { describe, expect, it } from "vitest";
import { generateProfilePageJsonLd } from "@/app/(public)/[userSlugOrId]/_seo/json-ld";

type ProfileInput = Parameters<typeof generateProfilePageJsonLd>[0];
type ListingsInput = Parameters<typeof generateProfilePageJsonLd>[1];
type MetadataInput = Parameters<typeof generateProfilePageJsonLd>[2];

describe("profile page json-ld", () => {
  it("adds offers to nested Product nodes in makesOffer", async () => {
    const profile = {
      id: "user-1",
      title: "Rolling Oaks Daylilies",
      lists: [],
    } as unknown as ProfileInput;

    const listings = [
      {
        id: "listing-1",
        title: "Starman",
        price: 125,
        images: [{ url: "https://example.com/starman.jpg" }],
        lists: [],
      },
    ] as unknown as ListingsInput;

    const metadata = {
      title: "Rolling Oaks Daylilies",
      description: "Catalog",
      imageUrl: "https://example.com/cover.jpg",
      pageUrl: "https://daylily-catalog.com/rolling-oaks",
    } as MetadataInput;

    const jsonLd = await generateProfilePageJsonLd(profile, listings, metadata);
    const makesOffer = (jsonLd as Record<string, unknown>).mainEntity as {
      makesOffer?: Array<{
        itemOffered?: {
          offers?: { price?: string };
        };
      }>;
    };

    expect(makesOffer.makesOffer?.[0]?.itemOffered?.offers?.price).toBe("125.00");
  });

  it("omits makesOffer for listings without sellable product data", async () => {
    const profile = {
      id: "user-1",
      title: "Rolling Oaks Daylilies",
      lists: [],
    } as unknown as ProfileInput;

    const listings = [
      {
        id: "listing-no-price",
        title: "No Price Listing",
        price: null,
        images: [{ url: "https://example.com/no-price.jpg" }],
        lists: [],
      },
      {
        id: "listing-no-image",
        title: "No Image Listing",
        price: 90,
        images: [],
        lists: [],
      },
    ] as unknown as ListingsInput;

    const metadata = {
      title: "Rolling Oaks Daylilies",
      description: "Catalog",
      imageUrl: "https://example.com/cover.jpg",
      pageUrl: "https://daylily-catalog.com/rolling-oaks",
    } as MetadataInput;

    const jsonLd = await generateProfilePageJsonLd(profile, listings, metadata);
    const mainEntity = (jsonLd as Record<string, unknown>).mainEntity as {
      makesOffer?: unknown[];
    };

    expect(mainEntity.makesOffer).toBeUndefined();
  });
});
