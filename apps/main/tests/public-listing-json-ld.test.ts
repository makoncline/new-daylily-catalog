import { describe, expect, it } from "vitest";
import { createListingJsonLd } from "@/app/(public)/[userSlugOrId]/[listingSlugOrId]/_seo/json-ld";

type ListingInput = Parameters<typeof createListingJsonLd>[0]["listing"];

function createListing(price: number | null) {
  return {
    id: "listing-1",
    title: "Starman",
    slug: "starman",
    price,
    sellerTitle: "Rolling Oaks",
    userSlug: "rolling-oaks",
    ahsListing: {
      hybridizer: "Kirchhoff",
      year: 1997,
      ploidy: "Tet",
      bloomSize: "6",
    },
  } as unknown as ListingInput;
}

function generateJsonLd(price: number | null) {
  return createListingJsonLd({
    baseUrl: "https://daylilycatalog.com",
    canonicalPath: "/rolling-oaks/starman",
    description: "Starman from Rolling Oaks.",
    imageUrl: "https://example.com/starman.jpg",
    listing: createListing(price),
    listingUrl: "https://daylilycatalog.com/rolling-oaks/starman",
  });
}

describe("public listing json-ld", () => {
  it("uses Product schema with an Offer for priced listings", () => {
    const [schema] = generateJsonLd(100);

    expect(schema).toMatchObject({
      "@type": "Product",
      offers: {
        "@type": "Offer",
        price: "100.00",
      },
    });
  });

  it.each([null, 0, -10])(
    "uses WebPage schema without a Product for a non-positive price of %s",
    (price) => {
      const [schema] = generateJsonLd(price);

      expect(schema).toMatchObject({
        "@type": "WebPage",
        mainEntity: {
          "@type": "Thing",
        },
      });
      expect(JSON.stringify(schema)).not.toContain('"@type":"Product"');
    },
  );
});
