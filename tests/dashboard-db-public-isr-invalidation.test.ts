// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { CACHE_CONFIG } from "@/config/cache-config";

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

type UserProfileRouterModule =
  typeof import("@/server/api/routers/dashboard-db/user-profile");
type ListingRouterModule =
  typeof import("@/server/api/routers/dashboard-db/listing");
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
  const dbWithDefaults = db as Record<string, unknown>;
  return {
    db: dbWithDefaults as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  };
}

function expectNoBasePublicTagInvalidations() {
  const baseTags = [
    CACHE_CONFIG.TAGS.PUBLIC_PROFILE,
    CACHE_CONFIG.TAGS.PUBLIC_PROFILES,
    CACHE_CONFIG.TAGS.PUBLIC_LISTINGS,
    CACHE_CONFIG.TAGS.PUBLIC_LISTING_DETAIL,
    CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE,
    CACHE_CONFIG.TAGS.PUBLIC_FOR_SALE_COUNT,
    CACHE_CONFIG.TAGS.PUBLIC_CATALOG_ROUTES,
  ] as const;

  baseTags.forEach((tag) => {
    expect(revalidateTagMock.mock.calls.some((call) => call[0] === tag)).toBe(
      false,
    );
  });
}

function expectNoCultivarTagInvalidations() {
  const cultivarTags = [
    CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE,
    CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_SITEMAP,
  ] as const;

  cultivarTags.forEach((tag) => {
    expect(revalidateTagMock.mock.calls.some((call) => call[0] === tag)).toBe(
      false,
    );
  });
}

function hasPaginatedPathInvalidation() {
  return revalidatePathMock.mock.calls.some((call) => {
    const [path] = call as [unknown];
    return typeof path === "string" && path.includes("/page/");
  });
}

describe("dashboardDb public ISR invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("profile.update invalidates the user catalog pages and catalogs index", async () => {
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
    };

    const caller = dashboardDbUserProfileRouter.createCaller(createContext(db));
    await caller.update({
      data: {
        title: "Garden",
      },
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(hasPaginatedPathInvalidation()).toBe(false);
    expect(captureServerPosthogEventMock).toHaveBeenCalledTimes(
      revalidatePathMock.mock.calls.length,
    );

    revalidatePathMock.mock.calls.forEach((call) => {
      const [path, type] = call as [string, ("page" | "layout") | undefined];
      const matchingEvent = captureServerPosthogEventMock.mock.calls
        .map((eventCall) => eventCall[0] as unknown)
        .find((event) => {
          if (!event || typeof event !== "object") {
            return false;
          }

          const { properties } = event as {
            properties?: {
              target_path?: unknown;
              target_type?: unknown;
            };
          };

          return (
            properties?.target_path === path &&
            properties.target_type === (type ?? "page")
          );
        });

      expect(matchingEvent).toMatchObject({
        distinctId: "system:public-isr",
        event: "public_isr_invalidated",
        properties: {
          source_page: "server:dashboard-db.public-isr-invalidation",
          target_kind: "path",
          target_path: path,
          target_type: type ?? "page",
          transport: "direct",
          trigger_source: "dashboard-db.catalog-mutation",
        },
      });
    });

    expectNoBasePublicTagInvalidations();
    expect(
      revalidateTagMock.mock.calls.some(
        (call) => call[0] === CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE,
      ),
    ).toBe(false);
  });

  it("profile.update on slug change invalidates old slug, new slug, and user-id alias routes", async () => {
    const db = {
      userProfile: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ slug: "old-garden" })
          .mockResolvedValueOnce({ slug: "new-garden" }),
        upsert: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          title: "Garden",
          slug: "new-garden",
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
        slug: "new-garden",
      },
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/old-garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/new-garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(hasPaginatedPathInvalidation()).toBe(false);
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("profile.updateContent does not invalidate public routes directly", async () => {
    const db = {
      userProfile: {
        upsert: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          title: "Garden",
          slug: "garden",
          logoUrl: null,
          description: null,
          content: "Updated content",
          location: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    };

    const caller = dashboardDbUserProfileRouter.createCaller(createContext(db));
    await caller.updateContent({
      content: "Updated content",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(captureServerPosthogEventMock).not.toHaveBeenCalled();
  });

  it("listing.update invalidates the user's first page, catalogs index, and the listing cultivar page", async () => {
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/lime-frosting");
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("listing.create invalidates the user's first page, catalogs index, and linked cultivar page", async () => {
    const db = {
      cultivarReference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cr-1",
          normalizedName: "happy returns",
        }),
      },
      listing: {
        findFirst: vi.fn().mockResolvedValue(null),
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

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/happy-returns");
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("listing.linkAhs does not invalidate public routes directly", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReferenceId: null,
        }),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Updated",
          slug: "updated",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-2",
        }),
      },
      cultivarReference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cr-2",
          ahsListing: { name: "New Name" },
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.linkAhs({
      id: "listing-1",
      cultivarReferenceId: "cr-2",
      syncName: false,
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("listing.linkAhs rejects direct relink without unlinking first", async () => {
    const cultivarFindUnique = vi.fn();
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReferenceId: "cr-old",
        }),
      },
      cultivarReference: {
        findUnique: cultivarFindUnique,
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await expect(
      caller.linkAhs({
        id: "listing-1",
        cultivarReferenceId: "cr-new",
        syncName: false,
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    expect(cultivarFindUnique).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("listing.syncAhsName does not invalidate public routes directly", async () => {
    const db = {
      listing: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: "listing-1",
            cultivarReference: {
              ahsListing: { name: "Synced Name" },
            },
          })
          .mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Synced Name",
          slug: "synced-name",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: "cr-2",
        }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.syncAhsName({
      id: "listing-1",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("listing.unlinkAhs invalidates the user's first page, catalogs index, and old cultivar page", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReference: { normalizedName: "old name" },
        }),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          title: "Updated",
          slug: "updated",
          price: null,
          description: null,
          privateNote: null,
          status: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          cultivarReferenceId: null,
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.unlinkAhs({
      id: "listing-1",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/old-name");
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("listing.delete invalidates the user's first page, catalogs index, and the linked cultivar page", async () => {
    const txListingDelete = vi.fn().mockResolvedValue(undefined);
    const txListUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "listing-1",
          cultivarReference: { normalizedName: "happy returns" },
        }),
      },
      list: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
        await callback({
          listing: { delete: txListingDelete },
          list: { updateMany: txListUpdateMany },
        });
      }),
    };

    const caller = dashboardDbListingRouter.createCaller(createContext(db));
    await caller.delete({
      id: "listing-1",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/happy-returns");
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("list.update invalidates the user's first page, catalogs index, and linked cultivars in that list", async () => {
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
        findMany: vi
          .fn()
          .mockResolvedValue([
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/happy-returns");
    expect(revalidatePathMock).toHaveBeenCalledWith("/cultivar/lime-frosting");
    expectNoBasePublicTagInvalidations();
    expectNoCultivarTagInvalidations();
  });

  it("list.create invalidates the user's first page and catalogs index", async () => {
    const db = {
      list: {
        create: vi.fn().mockResolvedValue({
          id: "list-1",
          userId: "user-1",
          title: "Favorites",
          description: null,
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
    await caller.create({
      title: "Favorites",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expectNoBasePublicTagInvalidations();
    expect(
      revalidateTagMock.mock.calls.some(
        (call) => call[0] === CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE,
      ),
    ).toBe(false);
    expect(
      revalidatePathMock.mock.calls.some((call) =>
        typeof call[0] === "string" ? call[0].startsWith("/cultivar/") : false,
      ),
    ).toBe(false);
  });

  it("list.delete invalidates the user's first page and catalogs index", async () => {
    const db = {
      list: {
        findFirst: vi.fn().mockResolvedValue({
          id: "list-1",
          _count: { listings: 0 },
        }),
        delete: vi.fn().mockResolvedValue({ id: "list-1" }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbListRouter.createCaller(createContext(db));
    await caller.delete({
      id: "list-1",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/garden");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs");
    expectNoBasePublicTagInvalidations();
    expect(
      revalidateTagMock.mock.calls.some(
        (call) => call[0] === CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE,
      ),
    ).toBe(false);
    expect(
      revalidatePathMock.mock.calls.some((call) =>
        typeof call[0] === "string" ? call[0].startsWith("/cultivar/") : false,
      ),
    ).toBe(false);
  });
});
