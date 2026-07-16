// @vitest-environment node

import { describe, expect, it } from "vitest";

import { resolveLegacyImagesWithAssets } from "@/server/services/image-asset-read-model";

describe("image asset read model", () => {
  it("uses the requested ImageAsset variant", () => {
    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [
        {
          id: "asset-1",
          legacyImageId: "image-1",
          status: "ready",
          originalUrl: "https://media.example/original.webp",
          displayUrl: "https://media.example/display.webp",
          thumbUrl: "https://media.example/thumb.webp",
          blurUrl: "https://media.example/blur.webp",
        },
      ],
      variant: "thumb",
    });

    expect(image?.url).toBe("https://media.example/thumb.webp");
    expect(image?.imageAsset).toMatchObject({
      id: "asset-1",
      status: "ready",
      blurUrl: "https://media.example/blur.webp",
    });
  });

  it("keeps the legacy URL when an asset row is missing", () => {
    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [],
    });

    expect(image?.url).toBe("https://legacy.example/image.jpg");
  });

  it("falls back to the ImageAsset original when a variant is missing", () => {
    const [image] = resolveLegacyImagesWithAssets({
      images: [{ id: "image-1", url: "https://legacy.example/image.jpg" }],
      imageAssets: [
        {
          id: "asset-1",
          legacyImageId: "image-1",
          status: "pending_variants",
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
