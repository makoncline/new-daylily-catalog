// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("sharp", () => {
  throw new Error(
    "libvips-cpp.so: cannot open shared object file: No such file or directory",
  );
});

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-variant-processor-sharp-failure.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";

describe("image asset variant processor Sharp failures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("marks a pending asset failed when Sharp cannot load", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      ),
    );

    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      imageAsset: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "asset-pending-variants",
            originalUrl: "https://images.example/original.jpg",
            originalKey: "images/original.jpg",
            legacyImageId: null,
          },
        ]),
        updateMany,
      },
    };
    const { processPendingImageAssetVariants } = await import(
      "@/server/services/image-asset-variant-processor"
    );
    type ProcessOptions = Parameters<
      typeof processPendingImageAssetVariants
    >[0];

    const result = await processPendingImageAssetVariants({
      db: db as unknown as ProcessOptions["db"],
      limit: 1,
    });

    expect(result).toMatchObject({
      processed: 1,
      failed: 1,
      results: [
        {
          id: "asset-pending-variants",
          status: "failed",
          error: expect.any(String),
        },
      ],
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "asset-pending-variants",
        status: { not: "ready" },
      },
      data: { status: "variant_failed" },
    });
  });
});
