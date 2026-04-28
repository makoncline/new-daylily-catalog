import { describe, expect, it } from "vitest";
import { generateCultivarJsonLd } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_seo/json-ld";

type CultivarInput = Parameters<typeof generateCultivarJsonLd>[2];

describe("cultivar json-ld", () => {
  it("returns Product schema when priced offers exist", () => {
    const cultivarPage = {
      summary: {
        name: "Starman",
      },
      heroImages: [{ url: "https://example.com/starman.jpg" }],
      quickSpecs: {
        all: [{ label: "Hybridizer", value: "Kirchhoff" }],
      },
      offers: {
        gardenCards: [
          {
            title: "Rolling Oaks",
            slug: "rolling-oaks",
            offers: [{ id: "offer-1", price: 100 }],
          },
        ],
      },
    } as CultivarInput;

    const jsonLd = generateCultivarJsonLd(
      "https://daylily-catalog.com",
      "starman",
      cultivarPage,
    ) as {
      "@type": string;
      offers?: unknown[];
    };

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.offers).toHaveLength(1);
  });

  it("returns WebPage schema when no priced offers exist", () => {
    const cultivarPage = {
      summary: {
        name: "Starman",
      },
      heroImages: [{ url: "https://example.com/starman.jpg" }],
      quickSpecs: {
        all: [{ label: "Hybridizer", value: "Kirchhoff" }],
      },
      offers: {
        gardenCards: [
          {
            title: "Rolling Oaks",
            slug: "rolling-oaks",
            offers: [{ id: "offer-1", price: null }],
          },
        ],
      },
    } as CultivarInput;

    const jsonLd = generateCultivarJsonLd(
      "https://daylily-catalog.com",
      "starman",
      cultivarPage,
    ) as {
      "@type": string;
      offers?: unknown[];
    };

    expect(jsonLd["@type"]).toBe("WebPage");
    expect(jsonLd.offers).toBeUndefined();
  });
});
