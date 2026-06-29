// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listingFindMany: vi.fn(),
  getProUserIds: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    listing: {
      findMany: dbMocks.listingFindMany,
    },
  },
  replicaDb: {
    listing: {
      findMany: dbMocks.listingFindMany,
    },
  },
}));

vi.mock("@/server/db/getProUserIds", () => ({
  getProUserIds: dbMocks.getProUserIds,
}));

function createFeedListing(
  index: number,
  options: {
    imageUrls?: string[];
  } = {},
) {
  const id = `listing-${index.toString().padStart(3, "0")}`;
  const imageUrls = options.imageUrls ?? [
    `https://example.com/listing-${index}.jpg`,
  ];

  return {
    id,
    userId: "user-1",
    title: `Listing ${index}`,
    slug: id,
    price: 25,
    description: `Listing ${index} description`,
    privateNote: null,
    ahsId: null,
    cultivarReferenceId: `cultivar-reference-${index}`,
    status: "PUBLISHED",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    images: imageUrls.map((url, imageIndex) => ({
      id: `image-${index}-${imageIndex}`,
      url,
      order: imageIndex,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      status: null,
      userProfileId: null,
      listingId: id,
    })),
    cultivarReference: {
      id: `cultivar-reference-${index}`,
      ahsId: `ahs-${index}`,
      v2AhsCultivarId: null,
      normalizedName: `listing ${index}`,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      ahsListing: {
        id: `ahs-${index}`,
        name: `AHS Listing ${index}`,
        ahsImageUrl: null,
        hybridizer: null,
        year: null,
        scapeHeight: null,
        bloomSize: null,
        bloomSeason: null,
        ploidy: null,
        foliageType: null,
        bloomHabit: null,
        color: null,
        form: null,
        parentage: null,
        fragrance: null,
        budcount: null,
        branches: null,
        sculpting: null,
        foliage: null,
        flower: null,
      },
      v2AhsCultivar: null,
    },
    user: {
      id: "user-1",
      clerkUserId: null,
      stripeCustomerId: null,
      role: "USER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      profile: {
        id: "profile-1",
        userId: "user-1",
        title: "Test Garden",
        slug: "test-garden",
        logoUrl: null,
        description: null,
        content: null,
        location: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
  };
}

describe("google merchant feed route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://daylilycatalog.com";
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
    dbMocks.getProUserIds.mockResolvedValue(["user-1"]);
  });

  it("paginates listing queries to stay below database parameter limits", async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) =>
      createFeedListing(index + 1),
    );
    const secondPage = [createFeedListing(201)];
    dbMocks.listingFindMany
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { GET } = await import("@/app/api/google-merchant-feed/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/google-merchant-feed"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body.match(/<item>/g)).toHaveLength(201);
    expect(dbMocks.getProUserIds).toHaveBeenCalledTimes(1);
    expect(dbMocks.listingFindMany).toHaveBeenCalledTimes(2);
    expect(dbMocks.listingFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          price: { not: null },
          OR: [{ status: null }, { NOT: { status: "HIDDEN" } }],
          userId: { in: ["user-1"] },
        },
        orderBy: { id: "asc" },
        take: 200,
      }),
    );
    expect(dbMocks.listingFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: { id: "listing-200" },
        skip: 1,
        orderBy: { id: "asc" },
        take: 200,
      }),
    );
  });

  it("serves Daylily-owned S3 image links through the Cloudflare image URL", async () => {
    dbMocks.listingFindMany
      .mockResolvedValueOnce([
        createFeedListing(1, {
          imageUrls: [
            "https://daylily-catalog-images.s3.amazonaws.com/listing/main.jpg",
            "https://daylily-catalog-images.s3.us-east-1.amazonaws.com/listing/extra.jpg",
            "https://example.com/external.jpg",
          ],
        }),
      ])
      .mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/google-merchant-feed/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/google-merchant-feed"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/listing/main.jpg",
    );
    expect(body).toContain(
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.us-east-1.amazonaws.com/listing/extra.jpg",
    );
    expect(body).toContain("<g:additional_image_link>");
    expect(body).not.toContain("<g:image_link>https://daylily-catalog-images");
    expect(body).toContain(
      "<g:additional_image_link>https://example.com/external.jpg</g:additional_image_link>",
    );
  });
});
