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
});
