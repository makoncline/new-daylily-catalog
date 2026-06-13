import { beforeEach, describe, expect, it } from "vitest";
import { generateCultivarJsonLd } from "@/app/(public)/cultivar/[cultivarNormalizedName]/_seo/json-ld";

type CultivarInput = Parameters<typeof generateCultivarJsonLd>[2];

describe("cultivar json-ld", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
  });

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
    } as unknown as CultivarInput;

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
    } as unknown as CultivarInput;

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

  it("uses Cloudflare image URLs for Daylily-owned S3 hero images", () => {
    const cultivarPage = {
      summary: {
        name: "Starman",
      },
      heroImages: [
        {
          url: "https://daylily-catalog-images.s3.amazonaws.com/cultivar/starman.jpg",
        },
        {
          url: "https://example.com/external.jpg",
        },
      ],
      quickSpecs: {
        all: [],
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
    } as unknown as CultivarInput;

    const jsonLd = generateCultivarJsonLd(
      "https://daylily-catalog.com",
      "starman",
      cultivarPage,
    ) as {
      image: string[];
    };

    expect(jsonLd.image[0]).toBe(
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/cultivar/starman.jpg",
    );
    expect(jsonLd.image[1]).toBe("https://example.com/external.jpg");
  });
});
