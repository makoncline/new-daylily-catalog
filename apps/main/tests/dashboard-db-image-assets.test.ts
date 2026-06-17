// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-image-assets.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";
process.env.AWS_ACCESS_KEY_ID ??= "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY ??= "test-secret-key";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_BUCKET_NAME ??= "daylily-catalog-images-test";
process.env.R2_ACCOUNT_ID = "account-1";
process.env.R2_ACCESS_KEY_ID = "r2-key";
process.env.R2_SECRET_ACCESS_KEY = "r2-secret";
process.env.R2_BUCKET_NAME = "daylily-media";
process.env.R2_PUBLIC_BASE_URL = "https://media.daylilycatalog.com";
process.env.USE_IMAGE_ASSETS = "false";

const s3Mocks = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
  putObjectCommand: vi.fn((input: unknown) => ({ input })),
}));
const afterMock = vi.hoisted(() => vi.fn());
const variantProcessorMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: s3Mocks.putObjectCommand,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: s3Mocks.getSignedUrl,
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@/server/services/image-asset-variant-processor", () => ({
  processPendingImageAssetVariants: variantProcessorMock,
}));

type RouterModule = typeof import("@/server/api/routers/dashboard-db/image");
let dashboardDbImageRouter: RouterModule["dashboardDbImageRouter"];

beforeAll(async () => {
  ({ dashboardDbImageRouter } = await import(
    "@/server/api/routers/dashboard-db/image"
  ));
});

function createCaller(db: unknown) {
  return dashboardDbImageRouter.createCaller({
    db: db as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

function createImageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "image-1",
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/user-1/listing-1/uploaded.jpg`,
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
    variantProcessorMock.mockResolvedValue({
      processed: 1,
      failed: 0,
      results: [{ id: "image-1", status: "ready" }],
    });
    s3Mocks.getSignedUrl.mockImplementation(
      async (_client: unknown, command: { input: { Bucket?: string } }) =>
        command.input.Bucket === process.env.R2_BUCKET_NAME
          ? "https://r2-upload-url.example"
          : "https://s3-upload-url.example",
    );
  });

  it("presigns S3 and R2 uploads with the shared ImageAsset id", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };

    const result = await createCaller(db).getPresignedUrl({
      type: "listing",
      referenceId: "listing-1",
      contentType: "image/png",
      size: 1234,
    });

    expect(result.imageId).toEqual(expect.any(String));
    expect(result.presignedUrl).toBe("https://s3-upload-url.example");
    expect(result.r2).toEqual({
      presignedUrl: "https://r2-upload-url.example",
      key: `users/user-1/listing-images/listing-1/${result.imageId}/original.png`,
      url: `https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/${result.imageId}/original.png`,
    });
    expect(s3Mocks.getSignedUrl).toHaveBeenCalledTimes(2);
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
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };

    const key = "user-1/listing-1/uploaded.jpg";
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await createCaller(db).create({
      type: "listing",
      referenceId: "listing-1",
      imageId: "image-1",
      key,
      url,
      r2OriginalKey:
        "users/user-1/listing-images/listing-1/image-1/original.jpg",
    });

    expect(tx.image.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "image-1",
          listingId: "listing-1",
          url,
        }),
      }),
    );
    expect(tx.imageAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "image-1",
        legacyImageId: "image-1",
        listingId: "listing-1",
        originalKey:
          "users/user-1/listing-images/listing-1/image-1/original.jpg",
        originalUrl:
          "https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/image-1/original.jpg",
        status: "pending_variants",
      }),
    });

    expect(afterMock).toHaveBeenCalledTimes(1);
    const [scheduledTask] = afterMock.mock.calls[0] ?? [];
    expect(typeof scheduledTask).toBe("function");

    await scheduledTask();

    expect(variantProcessorMock).toHaveBeenCalledWith({
      db,
      assetId: "image-1",
      limit: 1,
    });
  });
});
