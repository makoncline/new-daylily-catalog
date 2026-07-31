// @vitest-environment node

import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { generateMetadata as generateCultivarSearchMetadata } from "@/app/(public)/cultivars/page";
import { buildPublicPageMetadata } from "@/app/(public)/_seo/public-seo";
import { generateHomePageJsonLd } from "@/app/(public)/_seo/json-ld";
import {
  generateCollectionMetadata,
  generateProfileMetadata,
} from "@/app/(public)/[userSlugOrId]/_seo/metadata";
import { getSocialCardImageUrl } from "@/lib/social-card";
import {
  buildCultivarMetaDescription,
} from "@/app/(public)/cultivar/[cultivarNormalizedName]/_lib/cultivar-page-route";
import { metadata as privacyMetadata } from "@/app/(public)/privacy/page";
import { metadata as supportMetadata } from "@/app/(public)/support/page";
import { metadata as termsMetadata } from "@/app/(public)/terms/page";

vi.mock("@/config/feature-flags", () => ({
  isPublicCultivarSearchEnabled: () => true,
}));

function getOpenGraphImageUrl(metadata: Metadata) {
  const images = metadata.openGraph?.images;
  const image = Array.isArray(images) ? images[0] : images;
  if (!image) return null;
  if (typeof image === "string" || image instanceof URL) return image.toString();
  return image.url.toString();
}

const profile = {
  id: "seller-1",
  title: "Mountain View Daylilies",
  slug: "mountain-view",
  description: "A high-country collection of distinctive daylilies.",
  location: "Colorado",
  images: [
    {
      id: "profile-image-1",
      url: "https://media.daylilycatalog.com/profile.webp",
    },
  ],
  lists: [
    {
      id: "list-1",
      title: "Late Bloomers",
      description: "Color for the final weeks of the daylily season.",
      listingCount: 12,
    },
  ],
};

describe("social sharing metadata", () => {
  it("omits app rich results without verified reviews", async () => {
    const jsonLd = await generateHomePageJsonLd({
      description: "Daylily catalog software for growers.",
      url: "https://daylilycatalog.com",
    });

    expect(jsonLd.map((schema) => schema["@type"])).not.toContain(
      "SoftwareApplication",
    );
  });

  it("uses stable renderer-versioned image URLs", () => {
    expect(
      getSocialCardImageUrl({
        baseUrl: "https://daylilycatalog.com",
        id: "seller-1",
        kind: "catalog",
      }),
    ).toBe("https://daylilycatalog.com/api/og/catalog/seller-1?v=2");
  });

  it("keeps the complete cultivar search Open Graph metadata", async () => {
    const metadata = await generateCultivarSearchMetadata({
      searchParams: Promise.resolve({}),
    });

    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(getOpenGraphImageUrl(metadata)).not.toBeNull();
  });

  it("keeps fixed public pages social-complete", () => {
    [privacyMetadata, supportMetadata, termsMetadata].forEach((metadata) => {
      expect(metadata.openGraph?.description).toBe(metadata.description);
      expect(metadata.openGraph?.url).toBe(metadata.url);
      expect(getOpenGraphImageUrl(metadata)).not.toBeNull();
      expect(metadata.twitter?.description).toBe(metadata.description);
    });
  });

  it("uses a catalog card without replacing the structured-data image", async () => {
    const metadata = await generateProfileMetadata(
      profile,
      "https://daylilycatalog.com",
    );

    expect(metadata.imageUrl).toBe(profile.images[0]!.url);
    expect(getOpenGraphImageUrl(metadata)).toBe(
      "https://daylilycatalog.com/api/og/catalog/seller-1?v=2",
    );
    expect(metadata.description?.length).toBeGreaterThanOrEqual(110);
    expect(metadata.description?.length).toBeLessThanOrEqual(160);
    expect(metadata.openGraph?.description).toBe(metadata.description);
  });

  it("builds useful cultivar descriptions within the search snippet limit", () => {
    const description = buildCultivarMetaDescription({
      gardensCount: 2,
      hybridizer: "Pierce G.",
      name: "Coffee Frenzy",
      offersCount: 4,
      year: "2013",
    });

    expect(description).toContain("Coffee Frenzy (Pierce G., 2013)");
    expect(description).toContain("4 public offers from 2 grower catalogs");
    expect(description.length).toBeGreaterThanOrEqual(110);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it("builds distinct list and for-sale previews", () => {
    const listMetadata = generateCollectionMetadata(
      profile,
      { lists: "list-1", mode: "advanced" },
      "https://daylilycatalog.com",
    );
    const forSaleMetadata = generateCollectionMetadata(
      profile,
      { price: "true", mode: "advanced" },
      "https://daylilycatalog.com",
    );

    expect(listMetadata?.title).toBe(
      "Late Bloomers | Mountain View Daylilies",
    );
    expect(getOpenGraphImageUrl(listMetadata!)).toBe(
      "https://daylilycatalog.com/api/og/list/list-1?v=2",
    );
    expect(getOpenGraphImageUrl(forSaleMetadata!)).toBe(
      "https://daylilycatalog.com/api/og/for-sale/seller-1?v=2",
    );
    expect(listMetadata?.robots).toBe("noindex, nofollow");
  });

  it("does not label combined filters as a broader collection", () => {
    expect(
      generateCollectionMetadata(
        profile,
        { lists: "list-1", price: "true" },
        "https://daylilycatalog.com",
      ),
    ).toBeNull();
  });

  it("lets listing pages supply their generated preview image", () => {
    const metadata = buildPublicPageMetadata({
      canonicalPath: "/mountain-view/ruby-throat",
      description: "A saturated red daylily with a vivid green throat.",
      imageAlt: "Ruby Throat daylily listing",
      imageUrl: "https://media.daylilycatalog.com/ruby-throat.webp",
      pageUrl: "https://daylilycatalog.com/mountain-view/ruby-throat",
      socialImageUrl:
        "https://daylilycatalog.com/api/og/listing/listing-1?v=2",
      title: "Ruby Throat",
    });

    expect(getOpenGraphImageUrl(metadata)).toBe(
      "https://daylilycatalog.com/api/og/listing/listing-1?v=2",
    );
  });
});
