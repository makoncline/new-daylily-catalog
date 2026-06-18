// @vitest-environment node

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-image.sqlite";
process.env.AWS_ACCESS_KEY_ID ??= "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY ??= "test-secret-key";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_BUCKET_NAME ??= "daylily-catalog-images-test";

const s3Mocks = vi.hoisted(() => ({
  putObjectCommand: vi.fn((input: unknown) => ({ input })),
  getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: s3Mocks.putObjectCommand,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: s3Mocks.getSignedUrl,
}));

type RouterModule = typeof import("@/server/api/routers/dashboard-db/image");
let dashboardDbImageRouter: RouterModule["dashboardDbImageRouter"];
const originalUseImageAssets = process.env.USE_IMAGE_ASSETS;

beforeAll(async () => {
  ({ dashboardDbImageRouter } = await import(
    "@/server/api/routers/dashboard-db/image"
  ));
});

interface MockDb {
  $queryRaw: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
  image: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  imageAsset: {
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  listing: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  userProfile: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  const image = {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const imageAsset = {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  };
  return {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (arg) =>
      typeof arg === "function"
        ? await arg({ image, imageAsset })
        : await Promise.all(arg),
    ),
    image,
    imageAsset,
    listing: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userProfile: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return dashboardDbImageRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s3Mocks.getSignedUrl.mockResolvedValue("https://upload-url.example");
  });

  afterEach(() => {
    if (originalUseImageAssets === undefined) {
      delete process.env.USE_IMAGE_ASSETS;
      return;
    }

    process.env.USE_IMAGE_ASSETS = originalUseImageAssets;
  });

  it("presigns only allowed image types with a server-derived extension and content length", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    const result = await caller.getPresignedUrl({
      type: "listing",
      referenceId: "listing-1",
      contentType: "image/jpeg",
      size: 1234,
    });

    expect(result.presignedUrl).toBe("https://upload-url.example");
    expect(result.key).toMatch(/^user-1\/listing-1\/[a-f0-9]{32}\.jpg$/);
    expect(result.url).toBe(
      `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${result.key}`,
    );
    expect(s3Mocks.putObjectCommand).toHaveBeenCalledWith({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: result.key,
      ContentType: "image/jpeg",
      ContentLength: 1234,
    });
  });

  it("rejects unsupported image content types before presigning", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    await expect(
      caller.getPresignedUrl({
        type: "listing",
        referenceId: "listing-1",
        contentType: "image/svg+xml" as never,
        size: 1234,
      }),
    ).rejects.toThrow();
    expect(db.listing.findFirst).not.toHaveBeenCalled();
    expect(s3Mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it("saves only owned upload keys that match the expected S3 URL", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValue({ id: "listing-1" });
    db.image.count.mockResolvedValue(0);
    db.image.create.mockImplementation(async (args) => ({
      id: "image-1",
      url: args.data.url,
      order: args.data.order,
      listingId: args.data.listingId,
      userProfileId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      status: null,
    }));

    const key = "user-1/listing-1/uploaded.jpg";
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const caller = createCaller(db);

    const result = await caller.create({
      type: "listing",
      referenceId: "listing-1",
      key,
      url,
    });

    expect(result.url).toBe(url);
    expect(db.image.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url,
          order: 0,
          listingId: "listing-1",
        }),
      }),
    );
  });

  it("rejects image records when the key does not belong to the current target", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValue({ id: "listing-1" });

    const key = "user-2/listing-1/uploaded.jpg";
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const caller = createCaller(db);

    await expect(
      caller.create({
        type: "listing",
        referenceId: "listing-1",
        key,
        url,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.image.create).not.toHaveBeenCalled();
  });

  it("rejects image records when the URL does not match the upload key", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);

    await expect(
      caller.create({
        type: "listing",
        referenceId: "listing-1",
        key: "user-1/listing-1/uploaded.jpg",
        url: "https://evil.example/uploaded.jpg",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.image.create).not.toHaveBeenCalled();
  });

  it("sync filters images through direct owner foreign keys", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.sync({
      since: "2026-01-01T00:00:00.000Z",
      cursor: { id: "image-0" },
      limit: 50,
    });

    expect(result).toEqual([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        status: null,
      },
    ]);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("sync returns dashboard thumb URLs with ImageAsset metadata when asset reads are enabled", async () => {
    process.env.USE_IMAGE_ASSETS = "true";
    const db = createMockDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "image-1",
        url: "https://daylily-catalog-images.s3.amazonaws.com/listing/image-1.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
    ]);
    db.imageAsset.findMany.mockResolvedValueOnce([
      {
        id: "asset-1",
        legacyImageId: "image-1",
        status: "ready",
        originalUrl: "https://media.example/image-1/original.jpg",
        displayUrl: "https://media.example/image-1/display-800.webp",
        thumbUrl: "https://media.example/image-1/thumb-200.webp",
        blurUrl: "https://media.example/image-1/blur-20.webp",
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: null });

    expect(result[0]).toMatchObject({
      id: "image-1",
      url: "https://media.example/image-1/thumb-200.webp",
      imageAsset: {
        id: "asset-1",
        displayUrl: "https://media.example/image-1/display-800.webp",
        thumbUrl: "https://media.example/image-1/thumb-200.webp",
        blurUrl: "https://media.example/image-1/blur-20.webp",
      },
    });
    expect(db.imageAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          legacyImageId: { in: ["image-1"] },
        },
      }),
    );
  });

  it("sync returns an empty page when the owner-checked query has no rows", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValueOnce([]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: null });

    expect(result).toEqual([]);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("list fetches images with owner-checked SQL instead of materialized listing ids", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue(
      Array.from({ length: 5000 }, (_, index) => ({ id: `listing-${index}` })),
    );
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "profile-image",
        url: "https://example.com/profile.jpg",
        order: 0,
        listingId: null,
        userProfileId: "profile-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
      {
        id: "listing-image",
        url: "https://example.com/listing.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.list();

    expect(result.map((row) => row.id)).toEqual([
      "profile-image",
      "listing-image",
    ]);
    expect(result[0]?.updatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("listByListingIds fetches image chunks with indexed owner-checked queries", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.listByListingIds({
      listingIds: ["listing-1", "listing-1"],
    });

    expect(result).toEqual([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        status: null,
      },
    ]);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("delete only removes an image that belongs to the owned target", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValueOnce({ id: "listing-1" });
    db.image.deleteMany.mockResolvedValueOnce({ count: 0 });

    const caller = createCaller(db);

    await expect(
      caller.delete({
        type: "listing",
        referenceId: "listing-1",
        imageId: "victim-image",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(db.image.deleteMany).toHaveBeenCalledWith({
      where: { id: "victim-image", listingId: "listing-1" },
    });
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("delete renumbers remaining images after deleting an owned image", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValueOnce({ id: "listing-1" });
    db.image.deleteMany.mockResolvedValueOnce({ count: 1 });
    db.image.findMany.mockResolvedValueOnce([
      { id: "image-2" },
      { id: "image-3" },
    ]);
    db.image.update.mockResolvedValue({});

    const caller = createCaller(db);
    const result = await caller.delete({
      type: "listing",
      referenceId: "listing-1",
      imageId: "image-1",
    });

    expect(result).toEqual({ success: true });
    expect(db.image.update).toHaveBeenCalledTimes(2);
    expect(db.image.update).toHaveBeenNthCalledWith(1, {
      where: { id: "image-2" },
      data: { order: 0 },
    });
    expect(db.image.update).toHaveBeenNthCalledWith(2, {
      where: { id: "image-3" },
      data: { order: 1 },
    });
  });

  it("reorder rejects image ids outside the owned target set", async () => {
    const db = createMockDb();
    db.listing.findFirst.mockResolvedValueOnce({ id: "listing-1" });
    db.image.findMany.mockResolvedValueOnce([{ id: "image-1" }]);

    const caller = createCaller(db);

    await expect(
      caller.reorder({
        type: "listing",
        referenceId: "listing-1",
        images: [
          { id: "image-1", order: 0 },
          { id: "victim-image", order: 1 },
        ],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(db.image.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("reorder updates only images from the owned target set", async () => {
    const db = createMockDb();
    db.userProfile.findFirst.mockResolvedValueOnce({ id: "profile-1" });
    db.image.findMany.mockResolvedValueOnce([
      { id: "image-1" },
      { id: "image-2" },
      { id: "image-3" },
    ]);
    db.image.update.mockResolvedValue({});

    const caller = createCaller(db);
    const result = await caller.reorder({
      type: "profile",
      referenceId: "profile-1",
      images: [
        { id: "image-3", order: 0 },
        { id: "image-1", order: 1 },
      ],
    });

    expect(result).toEqual({ success: true });
    expect(db.image.update).toHaveBeenCalledTimes(3);
    expect(db.image.update).toHaveBeenNthCalledWith(1, {
      where: { id: "image-3" },
      data: { order: 0 },
    });
    expect(db.image.update).toHaveBeenNthCalledWith(2, {
      where: { id: "image-1" },
      data: { order: 1 },
    });
    expect(db.image.update).toHaveBeenNthCalledWith(3, {
      where: { id: "image-2" },
      data: { order: 2 },
    });
  });
});
