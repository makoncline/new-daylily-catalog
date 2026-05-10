// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listingFindMany: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    listing: {
      findMany: dbMocks.listingFindMany,
    },
  },
}));

function createFeedListing(index: number) {
  const id = `listing-${index.toString().padStart(3, "0")}`;

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
    images: [
      {
        id: `image-${index}`,
        url: `https://example.com/listing-${index}.jpg`,
        order: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        status: null,
        userProfileId: null,
        listingId: id,
      },
    ],
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
    delete process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;
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
    expect(dbMocks.listingFindMany).toHaveBeenCalledTimes(2);
    expect(dbMocks.listingFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
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
});
