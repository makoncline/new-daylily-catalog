// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-public-isr-invalidation.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

const revalidatePathMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

type UserProfileRouterModule = typeof import("@/server/api/routers/dashboard-db/user-profile");
type ListingRouterModule = typeof import("@/server/api/routers/dashboard-db/listing");
type ListRouterModule = typeof import("@/server/api/routers/dashboard-db/list");

let dashboardDbUserProfileRouter: UserProfileRouterModule["dashboardDbUserProfileRouter"];
let dashboardDbListingRouter: ListingRouterModule["dashboardDbListingRouter"];
let dashboardDbListRouter: ListRouterModule["dashboardDbListRouter"];

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
});

function createContext(db: unknown) {
  return {
    db: db as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  };
}

describe("dashboardDb public ISR invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("profile.update invalidates the user catalog pages, catalogs index, and linked cultivar pages", async () => {
    const db = {
      userProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ slug: "garden" })
          .mockResolvedValueOnce({ slug: "garden" }),
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
      listing: {
        findMany: vi.fn().mockResolvedValue([
          { cultivarReference: { normalizedName: "happy returns" } },
          { cultivarReference: { normalizedName: "happy returns" } },
        ]),
      },
    };

    const caller = dashboardDbUserProfileRouter.createCaller(createContext(db));
    await caller.update({
      data: {
        title: "Garden",
      },
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/page/[page]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/search");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/happy-returns");
  });

  it("listing.update invalidates the user's pages, catalogs index, and the listing cultivar page", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          title: "Old",
          cultivarReference: { normalizedName: "lime frosting" },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Old",
          slug: "old",
          price: null,
          description: "Updated",
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-1",
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

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/page/[page]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/search");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/lime-frosting");
  });

  it("list.update invalidates the user's pages, catalogs index, and linked cultivars in that list", async () => {
    const db = {
      list: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: "list-1",
          userId: "user-1",
          title: "Favorites",
          description: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          listings: [{ id: "listing-1" }],
        }),
      },
      listing: {
        findMany: vi.fn().mockResolvedValue([
          { cultivarReference: { normalizedName: "happy returns" } },
          { cultivarReference: { normalizedName: "lime frosting" } },
        ]),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListRouter.createCaller(createContext(db));
    await caller.update({
      id: "list-1",
      data: {
        title: "Favorites",
      },
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/page/[page]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden/search");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/happy-returns");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/lime-frosting");
  });
});
