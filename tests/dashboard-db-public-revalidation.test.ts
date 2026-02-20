// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRevalidatePublicCatalogRoutes = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
const mockRevalidateCultivarRoutesByNormalizedNames = vi.hoisted(() =>
  vi.fn(),
);

vi.mock("@/server/cache/revalidate-public-catalog-routes", () => ({
  revalidatePublicCatalogRoutes: mockRevalidatePublicCatalogRoutes,
  revalidateCultivarRoutesByNormalizedNames:
    mockRevalidateCultivarRoutesByNormalizedNames,
}));
import { dashboardDbImageRouter } from "@/server/api/routers/dashboard-db/image";
import { dashboardDbListRouter } from "@/server/api/routers/dashboard-db/list";
import { dashboardDbListingRouter } from "@/server/api/routers/dashboard-db/listing";
import { dashboardDbUserProfileRouter } from "@/server/api/routers/dashboard-db/user-profile";

beforeEach(() => {
  vi.clearAllMocks();
});

function createBaseContext(db: Record<string, unknown>) {
  return {
    db: db as never,
    user: { id: "user-1" } as never,
    headers: new Headers(),
  };
}

describe("dashboardDb public revalidation hooks", () => {
  it("listing.update revalidates public catalog routes", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1", title: "Old" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Old",
          slug: "old",
          price: null,
          description: "New description",
          privateNote: null,
          status: null,
          createdAt: new Date("2026-02-20T00:00:00.000Z"),
          updatedAt: new Date("2026-02-20T00:00:00.000Z"),
          cultivarReferenceId: null,
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createBaseContext(db));

    await caller.update({
      id: "listing-1",
      data: { description: "New description" },
    });

    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
    });
  });

  it("list.addListingToList revalidates public catalog routes", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
      list: {
        findFirst: vi.fn().mockResolvedValue({ id: "list-1" }),
        update: vi.fn().mockResolvedValue({
          id: "list-1",
          userId: "user-1",
          title: "Favorites",
          description: null,
          status: null,
          createdAt: now,
          updatedAt: now,
          listings: [{ id: "listing-1" }],
        }),
      },
    };

    const caller = dashboardDbListRouter.createCaller(createBaseContext(db));

    await caller.addListingToList({
      listId: "list-1",
      listingId: "listing-1",
    });

    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
    });
  });

  it("image.create revalidates public catalog routes", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
      image: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: "image-1",
          url: "https://example.com/image.jpg",
          order: 0,
          listingId: "listing-1",
          userProfileId: null,
          createdAt: now,
          updatedAt: now,
          status: null,
        }),
      },
    };

    const caller = dashboardDbImageRouter.createCaller(createBaseContext(db));

    await caller.create({
      type: "listing",
      referenceId: "listing-1",
      key: "image-1",
      url: "https://example.com/image.jpg",
    });

    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
    });
  });

  it("userProfile.update revalidates and includes previous slug", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    const db = {
      userProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ slug: "old-slug" })
          .mockResolvedValueOnce({ slug: "old-slug" }),
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          title: "Garden",
          slug: "new-slug",
          logoUrl: null,
          description: null,
          content: null,
          location: null,
          createdAt: now,
          updatedAt: now,
        }),
      },
    };

    const caller = dashboardDbUserProfileRouter.createCaller(
      createBaseContext(db),
    );

    await caller.update({
      data: {
        slug: "new-slug",
      },
    });

    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
      additionalUserSegments: ["old-slug"],
    });
  });

  it("listing.linkAhs revalidates both previous and next cultivar pages", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReference: { normalizedName: "Old Cultivar" },
        }),
        update: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Old",
          slug: "old",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: now,
          updatedAt: now,
          cultivarReferenceId: "cultivar-2",
        }),
      },
      cultivarReference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cultivar-2",
          normalizedName: "New Cultivar",
          ahsListing: { name: "New Cultivar" },
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createBaseContext(db));

    await caller.linkAhs({
      id: "listing-1",
      cultivarReferenceId: "cultivar-2",
      syncName: false,
    });

    expect(mockRevalidateCultivarRoutesByNormalizedNames).toHaveBeenCalledWith([
      "Old Cultivar",
      "New Cultivar",
    ]);
    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
    });
  });

  it("listing.unlinkAhs revalidates previous cultivar page", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReference: { normalizedName: "Old Cultivar" },
        }),
        update: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Old",
          slug: "old",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: now,
          updatedAt: now,
          cultivarReferenceId: null,
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createBaseContext(db));

    await caller.unlinkAhs({ id: "listing-1" });

    expect(mockRevalidateCultivarRoutesByNormalizedNames).toHaveBeenCalledWith([
      "Old Cultivar",
    ]);
    expect(mockRevalidatePublicCatalogRoutes).toHaveBeenCalledWith({
      db,
      userId: "user-1",
    });
  });
});
