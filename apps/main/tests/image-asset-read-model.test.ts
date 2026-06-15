// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";

import { resolveLegacyImagesWithAssets } from "@/server/services/image-asset-read-model";

const originalUseImageAssets = process.env.USE_IMAGE_ASSETS;

describe("image asset read model", () => {
  afterEach(() => {
    if (originalUseImageAssets === undefined) {
      delete process.env.USE_IMAGE_ASSETS;
      return;
    }

    process.env.USE_IMAGE_ASSETS = originalUseImageAssets;
  });

  it("keeps legacy URLs when ImageAsset reads are disabled", () => {
    process.env.USE_IMAGE_ASSETS = "false";

    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [
        {
          id: "asset-1",
          legacyImageId: "image-1",
          originalUrl: "https://media.example/original.webp",
          displayUrl: "https://media.example/display.webp",
          thumbUrl: "https://media.example/thumb.webp",
          blurUrl: "https://media.example/blur.webp",
        },
      ],
    });

    expect(image?.url).toBe("https://legacy.example/image.jpg");
  });

  it("uses the requested ImageAsset variant when enabled", () => {
    process.env.USE_IMAGE_ASSETS = "true";

    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [
        {
          id: "asset-1",
          legacyImageId: "image-1",
          originalUrl: "https://media.example/original.webp",
          displayUrl: "https://media.example/display.webp",
          thumbUrl: "https://media.example/thumb.webp",
          blurUrl: "https://media.example/blur.webp",
        },
      ],
      variant: "thumb",
    });

    expect(image?.url).toBe("https://media.example/thumb.webp");
  });

  it("keeps the legacy URL when an asset row is missing", () => {
    process.env.USE_IMAGE_ASSETS = "true";

    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [],
    });

    expect(image?.url).toBe("https://legacy.example/image.jpg");
  });

  it("falls back to the ImageAsset original when a variant is missing", () => {
    process.env.USE_IMAGE_ASSETS = "true";

    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [
        {
          id: "asset-1",
          legacyImageId: "image-1",
          originalUrl: "https://media.example/original.webp",
          displayUrl: null,
          thumbUrl: null,
          blurUrl: null,
        },
      ],
      variant: "display",
    });

    expect(image?.url).toBe("https://media.example/original.webp");
  });
});
