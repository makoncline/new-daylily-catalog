// @vitest-environment node
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import {
  getPublicCultivarTag,
  getPublicForSaleCountTag,
  getPublicListingCardTag,
  getPublicListingsPageTag,
  getPublicProfileTag,
  getPublicSellerContentTag,
  getPublicSellerListsTag,
} from "@/lib/cache/public-cache-tags";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-public-isr-invalidation.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();
const afterMock = vi.hoisted(() =>
  vi.fn((task: () => Promise<void>) => {
    void task();
  }),
);
const captureServerPosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: captureServerPosthogEventMock,
}));

let dashboardDbUserProfileRouter: typeof import("@/server/api/routers/dashboard-db/user-profile").dashboardDbUserProfileRouter;
let dashboardDbListingRouter: typeof import("@/server/api/routers/dashboard-db/listing").dashboardDbListingRouter;
let dashboardDbListRouter: typeof import("@/server/api/routers/dashboard-db/list").dashboardDbListRouter;
let dashboardDbImageRouter: typeof import("@/server/api/routers/dashboard-db/image").dashboardDbImageRouter;

beforeAll(async () => {
  ({ dashboardDbUserProfileRouter } = await import(
    "@/server/api/routers/dashboard-db/user-profile"
  ));
  ({ dashboardDbListingRouter } = await import(
    "@/server/api/routers/dashboard-db/listing"
  ));
  ({ dashboardDbListRouter } = await import(
    "@/server/api/routers/dashboard-db/list"
  ));
  ({ dashboardDbImageRouter } = await import(
    "@/server/api/routers/dashboard-db/image"
  ));
});

function createContext(db: unknown) {
  const dbWithDefaults = db as Record<string, unknown>;
  return {
    db: dbWithDefaults as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  };
}

function expectPathInvalidated(path: string) {
  expect(revalidatePathMock).toHaveBeenCalledWith(path);
}

function expectPathNotInvalidated(path: string) {
  expect(revalidatePathMock).not.toHaveBeenCalledWith(path);
}

function expectTagInvalidated(tag: string) {
  expect(revalidateTagMock).toHaveBeenCalledWith(tag, "max");
}

describe("dashboardDb public ISR invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("profile.update invalidates catalogs and the seller root via seller references", async () => {
    const db = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
        upsert: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          title: "Garden",
          slug: "garden",
          logoUrl: null,
          description: null,
          content: null,
          location: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    };

    const caller = dashboardDbUserProfileRouter.createCaller(createContext(db));
    await caller.update({
      data: {
        title: "Garden",
      },
    });

    expectPathInvalidated("/catalogs");
    expectPathInvalidated("/garden");
    expectPathNotInvalidated("/garden/page/2");
    expectTagInvalidated(getPublicProfileTag("user-1"));
    expectTagInvalidated(getPublicSellerContentTag("user-1"));
    expectTagInvalidated(getPublicSellerListsTag("user-1"));
    expectTagInvalidated(getPublicListingsPageTag("user-1"));
    expectTagInvalidated(getPublicForSaleCountTag("user-1"));
  });

  it("listing.update invalidates the seller root and current linked cultivar without touching catalogs", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          title: "Old",
          cultivarReference: {
            normalizedName: "lime frosting",
          },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Updated",
          slug: "updated",
          price: null,
          description: "Updated",
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-1",
          cultivarReference: {
            normalizedName: "lime frosting",
          },
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.update({
      id: "listing-1",
      data: {
        description: "Updated",
      },
    });

    expectPathInvalidated("/garden");
    expectPathInvalidated("/cultivar/lime-frosting");
    expectPathNotInvalidated("/catalogs");
    expectPathNotInvalidated("/garden/page/2");
    expectTagInvalidated(getPublicListingCardTag("listing-1"));
    expectTagInvalidated(getPublicCultivarTag("lime-frosting"));
    expect(revalidateTagMock.mock.calls).toHaveLength(2);
  });

  it("listing.update skips public invalidation for private-note-only edits", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          title: "Old",
          cultivarReference: {
            normalizedName: "lime frosting",
          },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Old",
          slug: "old",
          price: null,
          description: "Visible",
          privateNote: "Updated note",
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-1",
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.update({
      id: "listing-1",
      data: {
        privateNote: "Updated note",
      },
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("listing.create invalidates catalogs, the seller root, and the linked cultivar", async () => {
    const db = {
      cultivarReference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cr-1",
          normalizedName: "happy returns",
        }),
      },
      listing: {
        create: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Happy Returns Division",
          slug: "happy-returns-division",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-1",
        }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.create({
      title: "Happy Returns Division",
      cultivarReferenceId: "cr-1",
    });

    expectPathInvalidated("/catalogs");
    expectPathInvalidated("/garden");
    expectPathInvalidated("/cultivar/happy-returns");
    expectTagInvalidated(getPublicProfileTag("user-1"));
    expectTagInvalidated(getPublicSellerContentTag("user-1"));
    expectTagInvalidated(getPublicSellerListsTag("user-1"));
    expectTagInvalidated(getPublicListingsPageTag("user-1"));
    expectTagInvalidated(getPublicForSaleCountTag("user-1"));
    expectTagInvalidated(getPublicCultivarTag("happy-returns"));
  });

  it("listing.delete invalidates catalogs, the seller root, and the previously linked cultivar", async () => {
    const tx = {
      listing: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
      list: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const db = {
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<void>) =>
        callback(tx),
      ),
      list: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReference: {
            normalizedName: "old-cultivar",
          },
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.delete({
      id: "listing-1",
    });

    expectPathInvalidated("/catalogs");
    expectPathInvalidated("/garden");
    expectPathInvalidated("/cultivar/old-cultivar");
    expectTagInvalidated(getPublicProfileTag("user-1"));
    expectTagInvalidated(getPublicSellerContentTag("user-1"));
    expectTagInvalidated(getPublicSellerListsTag("user-1"));
    expectTagInvalidated(getPublicListingsPageTag("user-1"));
    expectTagInvalidated(getPublicForSaleCountTag("user-1"));
    expectTagInvalidated(getPublicCultivarTag("old-cultivar"));
  });

  it("list mutations invalidate the seller root and seller tags without touching catalogs", async () => {
    const db = {
      list: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "list-1",
          userId: "user-1",
          title: "Wishlist",
          description: "Updated",
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          listings: [],
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListRouter.createCaller(createContext(db));
    await caller.update({
      id: "list-1",
      data: {
        title: "Wishlist",
      },
    });

    expectPathInvalidated("/garden");
    expectPathNotInvalidated("/catalogs");
    expectTagInvalidated(getPublicProfileTag("user-1"));
    expectTagInvalidated(getPublicSellerContentTag("user-1"));
    expectTagInvalidated(getPublicSellerListsTag("user-1"));
    expectTagInvalidated(getPublicListingsPageTag("user-1"));
    expectTagInvalidated(getPublicForSaleCountTag("user-1"));
  });

  it("profile image updates reuse the seller mapping", async () => {
    const db = {
      image: {
        findUnique: vi.fn().mockResolvedValue({
          id: "image-1",
          listingId: null,
          userProfileId: "profile-1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "image-1",
          url: "https://example.com/new.jpg",
          order: 0,
          listingId: null,
          userProfileId: "profile-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          status: null,
        }),
      },
      userProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: "profile-1" }),
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbImageRouter.createCaller(createContext(db));
    await caller.update({
      type: "profile",
      referenceId: "profile-1",
      imageId: "image-1",
      url: "https://example.com/new.jpg",
    });

    expectPathInvalidated("/catalogs");
    expectPathInvalidated("/garden");
    expectTagInvalidated(getPublicProfileTag("user-1"));
    expectTagInvalidated(getPublicSellerContentTag("user-1"));
    expectTagInvalidated(getPublicSellerListsTag("user-1"));
    expectTagInvalidated(getPublicListingsPageTag("user-1"));
    expectTagInvalidated(getPublicForSaleCountTag("user-1"));
  });
});
