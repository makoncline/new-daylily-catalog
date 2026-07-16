// @vitest-environment node

import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getListingIdFromSlugOrId: vi.fn(),
  getPublicListingDetail: vi.fn(),
  getPublicProfile: vi.fn(),
  getUserIdFromSlugOrId: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: vi.fn(),
}));

vi.mock("@/app/(public)/_components/main-content", () => ({
  MainContent: () => null,
}));

vi.mock(
  "@/app/(public)/[userSlugOrId]/_components/catalog-search-header",
  () => ({ CatalogSearchHeader: () => null }),
);

vi.mock("@/components/breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/listing-display", () => ({ ListingDisplay: () => null }));
vi.mock("@/components/server-breadcrumbs", () => ({
  ServerBreadcrumbs: () => null,
}));
vi.mock(
  "@/components/public-catalog-search/public-catalog-search-client",
  () => ({ PublicCatalogSearchClient: () => null }),
);
vi.mock(
  "@/app/(public)/[userSlugOrId]/[listingSlugOrId]/_components/public-listing-page-actions",
  () => ({
    PublicListingContactButton: () => null,
    PublicListingPageViewTracker: () => null,
  }),
);

vi.mock("@/server/db/getPublicProfile", () => ({
  getListingIdFromSlugOrId: mocks.getListingIdFromSlugOrId,
  getUserIdFromSlugOrId: mocks.getUserIdFromSlugOrId,
}));

vi.mock("@/server/db/public-listing-read-model", () => ({
  getInitialListings: vi.fn(),
  getPublicListingDetail: mocks.getPublicListingDetail,
}));

vi.mock("@/server/db/public-seller-read-model", () => ({
  getPublicProfile: mocks.getPublicProfile,
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

function getOpenGraphImageUrl(metadata: Metadata) {
  const images = metadata.openGraph?.images;
  const firstImage = Array.isArray(images) ? images[0] : images;

  if (!firstImage) {
    return null;
  }

  if (typeof firstImage === "string" || firstImage instanceof URL) {
    return firstImage.toString();
  }

  return firstImage.url.toString();
}

describe("social sharing metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a versioned catalog card while preserving the catalog image for structured data", async () => {
    const { generateProfileMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/_seo/metadata"
    );
    const updatedAt = new Date("2026-07-14T12:00:00.000Z");

    const metadata = await generateProfileMetadata(
      {
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
        updatedAt,
      },
      "https://daylilycatalog.com",
    );

    expect(metadata.imageUrl).toBe(
      "https://media.daylilycatalog.com/profile.webp",
    );
    expect(getOpenGraphImageUrl(metadata)).toBe(
      `https://daylilycatalog.com/api/og/catalog/seller-1?v=${updatedAt.getTime().toString(36)}`,
    );
    expect(metadata.twitter?.images).toEqual([
      `https://daylilycatalog.com/api/og/catalog/seller-1?v=${updatedAt.getTime().toString(36)}`,
    ]);
  });

  it("turns a single public list filter into a list-specific share preview", async () => {
    const updatedAt = new Date("2026-07-14T13:00:00.000Z");
    mocks.getPublicProfile.mockResolvedValue({
      id: "seller-1",
      title: "Mountain View Daylilies",
      slug: "mountain-view",
      description: null,
      location: "Colorado",
      images: [],
      lists: [
        {
          id: "list-1",
          title: "Late Bloomers",
          description: "Color for the final weeks of the daylily season.",
          listingCount: 12,
        },
      ],
      updatedAt,
    });

    const { generateMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/search/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ userSlugOrId: "mountain-view" }),
      searchParams: Promise.resolve({ lists: "list-1" }),
    });

    expect(metadata.title).toBe("Late Bloomers | Mountain View Daylilies");
    expect(metadata.openGraph?.url).toBe(
      "https://daylilycatalog.com/mountain-view/search?lists=list-1",
    );
    expect(getOpenGraphImageUrl(metadata)).toBe(
      `https://daylilycatalog.com/api/og/list/list-1?v=${updatedAt.getTime().toString(36)}`,
    );
    expect(metadata.alternates?.canonical).toBe("/mountain-view");
    expect(metadata.robots).toBe("noindex, nofollow");
  });

  it("gives the synthetic for-sale collection its own share preview", async () => {
    const updatedAt = new Date("2026-07-14T13:30:00.000Z");
    mocks.getPublicProfile.mockResolvedValue({
      id: "seller-1",
      title: "Mountain View Daylilies",
      slug: "mountain-view",
      description: null,
      location: "Colorado",
      images: [],
      lists: [],
      updatedAt,
    });

    const { generateMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/search/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ userSlugOrId: "mountain-view" }),
      searchParams: Promise.resolve({ price: "true" }),
    });

    expect(metadata.title).toBe("For Sale | Mountain View Daylilies");
    expect(metadata.openGraph?.url).toBe(
      "https://daylilycatalog.com/mountain-view/search?price=true",
    );
    expect(getOpenGraphImageUrl(metadata)).toBe(
      `https://daylilycatalog.com/api/og/for-sale/seller-1?v=${updatedAt.getTime().toString(36)}`,
    );
    expect(metadata.robots).toBe("noindex, nofollow");
  });

  it("does not describe combined filters as a broader list", async () => {
    mocks.getPublicProfile.mockResolvedValue({
      id: "seller-1",
      title: "Mountain View Daylilies",
      slug: "mountain-view",
      images: [],
      lists: [
        {
          id: "list-1",
          title: "Late Bloomers",
          description: null,
          listingCount: 12,
        },
      ],
      updatedAt: new Date("2026-07-14T13:00:00.000Z"),
    });

    const { generateMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/search/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ userSlugOrId: "mountain-view" }),
      searchParams: Promise.resolve({ lists: "list-1", price: "true" }),
    });

    expect(metadata.title).toBe("Mountain View Daylilies Catalog Search");
    expect(metadata.openGraph).toBeUndefined();
  });

  it("uses the listing card for a public listing preview", async () => {
    const updatedAt = new Date("2026-07-14T14:00:00.000Z");
    const imageUpdatedAt = new Date("2026-07-14T14:30:00.000Z");
    mocks.getUserIdFromSlugOrId.mockResolvedValue("seller-1");
    mocks.getListingIdFromSlugOrId.mockResolvedValue("listing-1");
    mocks.getPublicListingDetail.mockResolvedValue({
      id: "listing-1",
      userId: "seller-1",
      userSlug: "mountain-view",
      slug: "ruby-throat",
      title: "Ruby Throat",
      description: "A saturated red daylily with a vivid green throat.",
      price: 25,
      sellerTitle: "Mountain View Daylilies",
      images: [
        {
          id: "listing-image-1",
          url: "https://media.daylilycatalog.com/ruby-throat.webp",
          updatedAt: imageUpdatedAt,
        },
      ],
      ahsListing: null,
      hasActiveSubscription: true,
      updatedAt,
      socialCardUpdatedAt: imageUpdatedAt,
    });

    const { generateMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/[listingSlugOrId]/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({
        userSlugOrId: "mountain-view",
        listingSlugOrId: "ruby-throat",
      }),
    });

    expect(getOpenGraphImageUrl(metadata)).toBe(
      `https://daylilycatalog.com/api/og/listing/listing-1?v=${imageUpdatedAt.getTime().toString(36)}`,
    );
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        alt: "Ruby Throat daylily listing",
        type: "image/png",
        width: 1200,
        height: 630,
      }),
    ]);
  });
});
