// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import {
  resolveCultivarReferenceImage,
  type CultivarReferenceImageView,
} from "@/server/services/cultivar-reference-image-read-model";
import type { ImageAssetUrlRow } from "@/server/services/image-asset-read-model";

const generatedAssetRow = {
  blurUrl: "https://cdn.example.com/generated-blur.txt",
  displayUrl: "https://cdn.example.com/generated-display.jpg",
  id: "asset-1",
  legacyImageId: null,
  originalUrl: "https://cdn.example.com/generated-original.jpg",
  status: "ready",
  thumbUrl: "https://cdn.example.com/generated-thumb.jpg",
} satisfies ImageAssetUrlRow;

const originalUseGeneratedCultivarImageAssets =
  process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS;

function expectCultivarImage(
  image: CultivarReferenceImageView | null,
): asserts image is CultivarReferenceImageView {
  expect(image).not.toBeNull();
}

describe("generated cultivar image assets", () => {
  afterEach(() => {
    if (originalUseGeneratedCultivarImageAssets === undefined) {
      delete process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS;
    } else {
      process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS =
        originalUseGeneratedCultivarImageAssets;
    }
  });

  it("uses the fallback cultivar image while generated assets are disabled", () => {
    process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS = "false";

    const image = resolveCultivarReferenceImage({
      fallbackImageUrl: "https://legacy.example.com/fallback.jpg",
      id: "cultivar-image",
      imageAssets: [generatedAssetRow],
    });

    expectCultivarImage(image);
    expect(image).toEqual({
      id: "cultivar-image",
      url: "https://legacy.example.com/fallback.jpg",
    });
  });

  it("uses the generated ImageAsset when the server flag is enabled", () => {
    process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS = "true";

    const image = resolveCultivarReferenceImage({
      fallbackImageUrl: "https://legacy.example.com/fallback.jpg",
      id: "cultivar-image",
      imageAssets: [generatedAssetRow],
    });

    expectCultivarImage(image);
    expect(image).toMatchObject({
      id: "cultivar-image",
      imageAsset: {
        blurUrl: "https://cdn.example.com/generated-blur.txt",
        displayUrl: "https://cdn.example.com/generated-display.jpg",
        id: "asset-1",
      },
      url: "https://cdn.example.com/generated-display.jpg",
    });
  });

  it("falls back to the generated original URL when the display URL is missing", () => {
    process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS = "true";

    const image = resolveCultivarReferenceImage({
      id: "cultivar-image",
      imageAssets: [{ ...generatedAssetRow, displayUrl: null }],
    });

    expectCultivarImage(image);
    expect(image.url).toBe("https://cdn.example.com/generated-original.jpg");
  });
});
