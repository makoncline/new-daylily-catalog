// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/error-utils", () => ({
  reportError: reportErrorMock,
}));

import { resolveLegacyImagesWithAssets } from "@/server/services/image-asset-read-model";

const originalUseImageAssets = process.env.USE_IMAGE_ASSETS;

describe("image asset read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      source: "test",
    });

    expect(image?.url).toBe("https://legacy.example/image.jpg");
    expect(reportErrorMock).not.toHaveBeenCalled();
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
      source: "test",
      variant: "thumb",
    });

    expect(image?.url).toBe("https://media.example/thumb.webp");
    expect(reportErrorMock).not.toHaveBeenCalled();
  });

  it("falls back to the ImageAsset original and reports missing variants", () => {
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
      source: "public-listing",
      variant: "display",
    });

    expect(image?.url).toBe("https://media.example/original.webp");
    expect(reportErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warning",
        context: expect.objectContaining({
          imageId: "image-1",
          imageAssetId: "asset-1",
          requestedVariant: "display",
          source: "public-listing",
        }),
      }),
    );
  });
});
