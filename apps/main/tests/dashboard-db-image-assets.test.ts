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

const SAFE_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const SAFE_IMAGE_SIZE = Buffer.from(
  SAFE_IMAGE_DATA_URL.split(",")[1]!,
  "base64",
).byteLength;

const s3Mocks = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
  putObjectCommand: vi.fn((input: unknown) => ({ input })),
}));
const afterMock = vi.hoisted(() => vi.fn());
const variantProcessorMock = vi.hoisted(() => vi.fn());
const captureServerPosthogEventMock = vi.hoisted(() => vi.fn());
const reportErrorMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());
const consoleInfoMock = vi
  .spyOn(console, "info")
  .mockImplementation(() => undefined);

vi.stubGlobal("fetch", fetchMock);

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

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: captureServerPosthogEventMock,
}));

vi.mock("@/lib/error-utils", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/error-utils")>(
      "@/lib/error-utils",
    );
  return { ...actual, reportError: reportErrorMock };
});

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

async function runAfterTask(index = 0) {
  const task = afterMock.mock.calls[index]?.[0] as
    | (() => Promise<void> | void)
    | undefined;
  if (!task) throw new Error("Expected an after() task");
  await task();
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
    process.env.IMAGE_MODERATION_ENFORCED = "false";
    process.env.OPENAI_IMAGE_MODERATION_API_KEY = "test-moderation-key";
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

    expect("moderationRequired" in result).toBe(false);
    if ("moderationRequired" in result) throw new Error("Unexpected result");
    expect(result.imageId).toEqual(expect.any(String));
    expect(result.presignedUrl).toBe("https://s3-upload-url.example");
    expect(result.r2).toEqual({
      presignedUrl: "https://r2-upload-url.example",
      key: `users/user-1/listing-images/listing-1/${result.imageId}/original.png`,
      url: `https://media.daylilycatalog.com/users/user-1/listing-images/listing-1/${result.imageId}/original.png`,
    });
    expect(result.shadowModerationRequested).toBe(true);
    expect(s3Mocks.getSignedUrl).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables moderation when the API key is missing", async () => {
    delete process.env.OPENAI_IMAGE_MODERATION_API_KEY;
    process.env.IMAGE_MODERATION_ENFORCED = "true";
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

    expect("moderationRequired" in result).toBe(false);
    if ("moderationRequired" in result) throw new Error("Unexpected result");
    expect(result.shadowModerationRequested).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs shadow failures without affecting issued upload URLs", async () => {
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      createCaller(db).moderateImage({
        type: "listing",
        referenceId: "listing-1",
        contentType: "image/png",
        size: SAFE_IMAGE_SIZE,
        imageDataUrl: SAFE_IMAGE_DATA_URL,
      }),
    ).resolves.toEqual({ outcome: "unavailable", sexualScore: undefined });
    const moderationLogs = consoleInfoMock.mock.calls
      .map(([message]) => String(message))
      .filter((message) => message.includes('"event":"image_moderation"'));
    expect(moderationLogs).toHaveLength(1);
    expect(JSON.parse(moderationLogs[0]!)).toMatchObject({
      event: "image_moderation",
      mode: "shadow",
      outcome: "unavailable",
      decision: "allow",
    });
  });

  it("moderates the submitted image before issuing checksum-bound URLs", async () => {
    process.env.IMAGE_MODERATION_ENFORCED = "yes";
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };
    const caller = createCaller(db);
    const input = {
      type: "listing" as const,
      referenceId: "listing-1",
      contentType: "image/png" as const,
      size: SAFE_IMAGE_SIZE,
    };

    await expect(caller.getPresignedUrl(input)).resolves.toEqual({
      moderationRequired: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              categories: { sexual: false, "sexual/minors": false },
              category_scores: {
                sexual: 0.001,
                "sexual/minors": 0.0001,
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await caller.getPresignedUrl({
      ...input,
      imageDataUrl: SAFE_IMAGE_DATA_URL,
    });

    if ("moderationRequired" in result) throw new Error("Unexpected result");
    expect(result.contentMd5).toEqual(expect.any(String));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/moderations",
      expect.objectContaining({ method: "POST" }),
    );
    expect(s3Mocks.putObjectCommand).toHaveBeenCalledTimes(2);
    expect(s3Mocks.putObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ ContentMD5: result.contentMd5 }),
    );
  });

  it("rejects sexual images before issuing upload URLs", async () => {
    process.env.IMAGE_MODERATION_ENFORCED = "true";
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              categories: { sexual: true, "sexual/minors": false },
              category_scores: { sexual: 0.99, "sexual/minors": 0.001 },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      createCaller(db).getPresignedUrl({
        type: "listing",
        referenceId: "listing-1",
        contentType: "image/png",
        size: SAFE_IMAGE_SIZE,
        imageDataUrl: SAFE_IMAGE_DATA_URL,
      }),
    ).rejects.toThrow("We couldn't accept this image");
    expect(s3Mocks.getSignedUrl).not.toHaveBeenCalled();
    await runAfterTask();
    expect(captureServerPosthogEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: "image_moderation_rejected" }),
    );
  });

  it("allows enforced uploads and reports when moderation is unavailable", async () => {
    process.env.IMAGE_MODERATION_ENFORCED = "true";
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const result = await createCaller(db).getPresignedUrl({
      type: "listing",
      referenceId: "listing-1",
      contentType: "image/png",
      size: SAFE_IMAGE_SIZE,
      imageDataUrl: SAFE_IMAGE_DATA_URL,
    });

    if ("moderationRequired" in result) throw new Error("Unexpected result");
    expect(result.contentMd5).toEqual(expect.any(String));
    expect(s3Mocks.getSignedUrl).toHaveBeenCalledTimes(2);
    expect(reportErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Image moderation unavailable",
        }),
        context: expect.objectContaining({
          source: "imageModeration",
          providerError: "OpenAI moderation failed with status 503",
        }),
      }),
    );
    await runAfterTask();
    expect(captureServerPosthogEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: "image_moderation_unavailable" }),
    );
    const moderationLogs = consoleInfoMock.mock.calls
      .map(([message]) => String(message))
      .filter((message) => message.includes('"event":"image_moderation"'));
    expect(moderationLogs).toHaveLength(1);
    expect(JSON.parse(moderationLogs[0]!)).toMatchObject({
      mode: "enforce",
      outcome: "unavailable",
      decision: "allow",
    });
  });

  it("rejects sexual content involving minors", async () => {
    process.env.IMAGE_MODERATION_ENFORCED = "true";
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              categories: { sexual: false, "sexual/minors": true },
              category_scores: { sexual: 0.01, "sexual/minors": 0.99 },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      createCaller(db).getPresignedUrl({
        type: "listing",
        referenceId: "listing-1",
        contentType: "image/png",
        size: SAFE_IMAGE_SIZE,
        imageDataUrl: SAFE_IMAGE_DATA_URL,
      }),
    ).rejects.toThrow("We couldn't accept this image");
    expect(s3Mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects animated images before moderation", async () => {
    process.env.IMAGE_MODERATION_ENFORCED = "true";
    const sharp = (await import("sharp")).default;
    const animatedImage = await sharp(Buffer.from([255, 0, 0, 0, 255, 0]), {
      raw: { width: 1, height: 2, channels: 3, pageHeight: 1 },
    })
      .webp({ loop: 0 })
      .toBuffer();
    const db = {
      listing: {
        findFirst: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
    };

    await expect(
      createCaller(db).getPresignedUrl({
        type: "listing",
        referenceId: "listing-1",
        contentType: "image/webp",
        size: animatedImage.byteLength,
        imageDataUrl: `data:image/webp;base64,${animatedImage.toString("base64")}`,
      }),
    ).rejects.toThrow("We couldn't accept this image");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(s3Mocks.getSignedUrl).not.toHaveBeenCalled();
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
