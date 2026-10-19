import { beforeAll, describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-storage-test.sqlite";
process.env.R2_PUBLIC_BASE_URL ??= "https://media.daylilycatalog.com";

let storage: typeof import("@/server/services/image-asset-storage");

beforeAll(async () => {
  storage = await import("@/server/services/image-asset-storage");
});

describe("image asset storage keys", () => {
  it("keeps first-upload keys stable", () => {
    const key = storage.buildOriginalImageAssetKey({
      kind: "listing",
      userId: "user-1",
      listingId: "listing-1",
      imageAssetId: "image-1",
      contentType: "image/jpeg",
    });

    expect(key).toBe(
      "users/user-1/listing-images/listing-1/image-1/original.jpg",
    );
    expect(
      storage.isExpectedOriginalImageAssetKey({
        kind: "listing",
        userId: "user-1",
        listingId: "listing-1",
        imageAssetId: "image-1",
        key,
      }),
    ).toBe(true);
  });

  it("derives variant keys from stable image asset keys", () => {
    expect(
      storage.buildVariantImageAssetKeys({
        kind: "profile",
        userId: "user-1",
        imageAssetId: "image-1",
      }),
    ).toEqual({
      displayKey: "users/user-1/profile-images/image-1/display-800.webp",
      thumbKey: "users/user-1/profile-images/image-1/thumb-200.webp",
      blurKey: "users/user-1/profile-images/image-1/blur-20.webp",
    });
  });

  it("derives variant keys from original object keys", () => {
    expect(
      storage.buildVariantImageAssetKeysFromOriginalKey(
        "users/user-1/listing-images/listing-1/image-1/original.webp",
      ),
    ).toEqual({
      displayKey:
        "users/user-1/listing-images/listing-1/image-1/display-800.webp",
      thumbKey: "users/user-1/listing-images/listing-1/image-1/thumb-200.webp",
      blurKey: "users/user-1/listing-images/listing-1/image-1/blur-20.webp",
    });
  });

  it("uses a content-bound original key for retryable uploads", () => {
    const digest = "a".repeat(64);
    const key = storage.buildOriginalImageAssetKey({
      kind: "listing",
      userId: "user-1",
      listingId: "listing-1",
      imageAssetId: "image-1",
      contentType: "image/png",
      contentDigest: digest,
    });
    expect(key).toBe(
      `users/user-1/listing-images/listing-1/image-1/original-${digest}.png`,
    );
    expect(
      storage.isExpectedOriginalImageAssetKey({
        kind: "listing",
        userId: "user-1",
        listingId: "listing-1",
        imageAssetId: "image-1",
        key,
      }),
    ).toBe(true);
    expect(storage.buildVariantImageAssetKeysFromOriginalKey(key).displayKey).toBe(
      "users/user-1/listing-images/listing-1/image-1/display-800.webp",
    );
  });

  it("rejects non-canonical keys before publishing URLs or variants", () => {
    expect(() => storage.buildR2PublicUrl("users/user-1/../bad.jpg")).toThrow(
      "ImageAsset key must not contain empty or dot segments.",
    );
    expect(() => storage.buildR2PublicUrl("/users/user-1/bad.jpg")).toThrow(
      "ImageAsset key must be a canonical relative R2 key.",
    );
    expect(() =>
      storage.buildVariantImageAssetKeys("users/user-1//image-1"),
    ).toThrow("ImageAsset key must be a canonical relative R2 key.");
  });

  it("derives original key extensions from validated content type", () => {
    expect(
      storage.buildOriginalImageAssetKey({
        kind: "profile",
        userId: "user-1",
        imageAssetId: "image-1",
        contentType: "image/webp",
      }),
    ).toBe("users/user-1/profile-images/image-1/original.webp");
  });

  it("keeps the integration R2 endpoint on loopback", () => {
    const previousMode = process.env.INTEGRATION_MODE;
    const previousEndpoint = process.env.INTEGRATION_R2_ENDPOINT_URL;
    try {
      process.env.INTEGRATION_MODE = "1";
      process.env.INTEGRATION_R2_ENDPOINT_URL = "https://storage.example.com";
      expect(() => storage.getR2Client()).toThrow(
        "Integration R2 endpoint must be loopback HTTP.",
      );
      process.env.INTEGRATION_MODE = "0";
      process.env.INTEGRATION_R2_ENDPOINT_URL = "http://127.0.0.1:39999";
      expect(() => storage.getR2Client()).toThrow(
        "Integration R2 endpoint must be loopback HTTP.",
      );
    } finally {
      if (previousMode === undefined) delete process.env.INTEGRATION_MODE;
      else process.env.INTEGRATION_MODE = previousMode;
      if (previousEndpoint === undefined)
        delete process.env.INTEGRATION_R2_ENDPOINT_URL;
      else process.env.INTEGRATION_R2_ENDPOINT_URL = previousEndpoint;
    }
  });
});
