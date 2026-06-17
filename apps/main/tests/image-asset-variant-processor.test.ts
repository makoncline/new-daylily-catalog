// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-variant-processor.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";

describe("image asset variant processor", () => {
  it("selects pending variants before failed retries", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const db = {
      imageAsset: { findMany },
    };
    const { processPendingImageAssetVariants } = await import(
      "@/server/services/image-asset-variant-processor"
    );
    type ProcessOptions = Parameters<
      typeof processPendingImageAssetVariants
    >[0];

    await processPendingImageAssetVariants({
      db: db as unknown as ProcessOptions["db"],
      limit: 5,
      retryFailed: true,
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending_variants" }),
        take: 5,
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: "variant_failed" }),
        take: 5,
      }),
    );
  });
});
