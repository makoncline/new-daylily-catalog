// @vitest-environment node

import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { buildPublicPageMetadata } from "@/app/(public)/_seo/public-seo";
import {
  generateCollectionMetadata,
  generateProfileMetadata,
} from "@/app/(public)/[userSlugOrId]/_seo/metadata";
import { getSocialCardImageUrl } from "@/lib/social-card";

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
  it("uses stable renderer-versioned image URLs", () => {
    expect(
      getSocialCardImageUrl({
        baseUrl: "https://daylilycatalog.com",
        id: "seller-1",
        kind: "catalog",
      }),
    ).toBe("https://daylilycatalog.com/api/og/catalog/seller-1?v=2");
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
