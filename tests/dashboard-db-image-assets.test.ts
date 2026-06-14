// @vitest-environment node
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-image-assets.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";
process.env.R2_ACCOUNT_ID = "account-1";
process.env.R2_ACCESS_KEY_ID = "r2-key";
process.env.R2_SECRET_ACCESS_KEY = "r2-secret";
process.env.R2_BUCKET_NAME = "daylily-media";
process.env.R2_PUBLIC_BASE_URL = "https://media.daylilycatalog.com";

const afterMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/server/analytics/public-isr-posthog", () => ({
  trackPublicIsrPathInvalidation: vi.fn(),
  trackPublicIsrTagInvalidation: vi.fn(),
}));

let dashboardDbImageRouter: typeof import("@/server/api/routers/dashboard-db/image").dashboardDbImageRouter;

beforeAll(async () => {
  ({ dashboardDbImageRouter } = await import(
    "@/server/api/routers/dashboard-db/image"
  ));
});

function createContext(db: unknown) {
  return {
    db: db as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  };
}

function createImageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "image-1",
    url: "https://legacy.example/image.jpg",
    order: 0,
    listingId: "listing-1",
    userProfileId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    status: null,
    ...overrides,
  };
}

describe("dashboard image asset mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_IMAGE_ASSETS = "false";
  });

  it("creates the legacy Image and matching ImageAsset for R2 uploads", async () => {
    const createdImage = createImageRow();
    const tx = {
      image: {
        create: vi.fn().mockResolvedValue(createdImage),
      },
      imageAsset: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };
    const db = {
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => unknown) =>
        callback(tx),
      ),
      image: {
        count: vi.fn().mockResolvedValue(0),
      },
      imageAsset: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          cultivarReference: null,
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbImageRouter.createCaller(createContext(db));

    await caller.create({
      type: "listing",
      referenceId: "listing-1",
      imageId: "image-1",
      key: "legacy-key.jpg",
      url: "https://legacy.example/image.jpg",
      r2OriginalKey: "users/user-1/listing-images/listing-1/image-1/original.jpg",
    });

    expect(tx.image.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "image-1",
          listingId: "listing-1",
          url: "https://legacy.example/image.jpg",
        }),
      }),
    );
    expect(tx.imageAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "image-1",
        legacyImageId: "image-1",
        listingId: "listing-1",
        originalKey: "users/user-1/listing-images/listing-1/image-1/original.jpg",
        originalUrl:
          "https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/image-1/original.jpg",
        status: "pending_variants",
      }),
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("resets variant URLs when replacing an image through R2", async () => {
    const updatedImage = createImageRow({
      url: "https://legacy.example/replacement.jpg",
    });
    const tx = {
      image: {
        update: vi.fn().mockResolvedValue(updatedImage),
      },
      imageAsset: {
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const db = {
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => unknown) =>
        callback(tx),
      ),
      image: {
        findUnique: vi.fn().mockResolvedValue({
          id: "image-1",
          listingId: "listing-1",
          userProfileId: null,
        }),
      },
      imageAsset: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "listing-1",
          userId: "user-1",
          cultivarReference: null,
        }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "garden" }),
      },
    };

    const caller = dashboardDbImageRouter.createCaller(createContext(db));

    await caller.update({
      type: "listing",
      referenceId: "listing-1",
      imageId: "image-1",
      url: "https://legacy.example/replacement.jpg",
      r2OriginalKey:
        "users/user-1/listing-images/listing-1/image-1/versions/a1b2c3d4e5f6/original.jpg",
    });

    expect(tx.imageAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { legacyImageId: "image-1" },
        update: expect.objectContaining({
          displayKey: null,
          displayUrl: null,
          thumbKey: null,
          thumbUrl: null,
          blurKey: null,
          blurUrl: null,
          originalKey:
            "users/user-1/listing-images/listing-1/image-1/versions/a1b2c3d4e5f6/original.jpg",
          originalUrl:
            "https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/image-1/versions/a1b2c3d4e5f6/original.jpg",
          status: "pending_variants",
        }),
      }),
    );
    expect(tx.imageAsset.deleteMany).not.toHaveBeenCalled();
    expect(afterMock).toHaveBeenCalledTimes(1);
  });
});
