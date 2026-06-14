import { beforeAll, describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-storage-test.sqlite";

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
      fileName: "daylily.JPG",
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

  it("supports versioned replacement keys for immutable variant URLs", () => {
    const key = storage.buildOriginalImageAssetKey({
      kind: "profile",
      userId: "user-1",
      imageAssetId: "image-1",
      versionId: "a1b2c3d4e5f6",
      fileName: "profile.png",
    });

    expect(key).toBe(
      "users/user-1/profile-images/image-1/versions/a1b2c3d4e5f6/original.png",
    );
    expect(
      storage.isExpectedOriginalImageAssetKey({
        kind: "profile",
        userId: "user-1",
        imageAssetId: "image-1",
        key,
        requireVersion: true,
      }),
    ).toBe(true);
    expect(
      storage.isExpectedOriginalImageAssetKey({
        kind: "profile",
        userId: "user-1",
        imageAssetId: "image-1",
        key: "users/user-1/profile-images/image-1/original.png",
        requireVersion: true,
      }),
    ).toBe(false);
  });
});
