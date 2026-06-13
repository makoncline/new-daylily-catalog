// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IMAGES } from "@/lib/constants/images";
import {
  getCloudflareUrlForDaylilyS3Image,
  getOptimizedMetaImageUrl,
} from "@/lib/utils/cloudflareLoader";

const originalCloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_URL;

describe("Cloudflare image URL helpers", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
  });

  afterEach(() => {
    if (originalCloudflareUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
      return;
    }

    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = originalCloudflareUrl;
  });

  it("reuses the existing full-size transform for Daylily-owned S3 images", () => {
    const url = getOptimizedMetaImageUrl(
      "https://daylily-catalog-images.s3.amazonaws.com/listing.jpg",
    );

    expect(url).toContain("https://cf.daylilycatalog.com/cdn-cgi/image/");
    expect(url).toContain("width=800");
    expect(url).toContain("fit=cover");
    expect(url).toContain("format=auto");
    expect(url).toContain("quality=90");
    expect(url).not.toContain("height=630");
  });

  it("converts public Daylily-owned S3 images to the full-size transform", () => {
    const url = getCloudflareUrlForDaylilyS3Image(
      "https://daylily-catalog-images.s3.amazonaws.com/listing.jpg",
    );

    expect(url).toContain("width=800");
    expect(url).toContain("quality=90");
    expect(url).not.toContain("width=1200");
    expect(url).not.toContain("height=630");
  });

  it("falls back instead of transforming untrusted external metadata images", () => {
    expect(getOptimizedMetaImageUrl("https://example.com/listing.jpg")).toBe(
      IMAGES.DEFAULT_META,
    );
  });
});
