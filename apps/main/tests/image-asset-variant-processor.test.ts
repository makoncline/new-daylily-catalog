// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-variant-processor.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";

describe("image asset variant processor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("selects pending variants before failed retries", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );

    const asset = (
      id: string,
      status: "pending_variants" | "variant_failed",
      createdAt: string,
    ) => ({
      id,
      status,
      createdAt,
      originalUrl: `https://images.example/${id}.jpg`,
      originalKey: `images/${id}.jpg`,
      legacyImageId: null,
    });
    const pending = [1, 2, 3, 4].map((number) =>
      asset(`pending-${number}`, "pending_variants", `2026-01-0${number}`),
    );
    const retries = [1, 2].map((number) =>
      asset(`retry-${number}`, "variant_failed", `2025-01-0${number}`),
    );
    const stored = [...retries, ...pending];
    const findMany = vi.fn(
      async ({
        where,
        take,
      }: {
        where: { status: "pending_variants" | "variant_failed" };
        take: number;
      }) =>
        stored
          .filter((item) => item.status === where.status)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(0, take),
    );
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      imageAsset: { findMany, updateMany },
    };
    const { processPendingImageAssetVariants } = await import(
      "@/server/services/image-asset-variant-processor"
    );
    type ProcessOptions = Parameters<
      typeof processPendingImageAssetVariants
    >[0];

    const result = await processPendingImageAssetVariants({
      db: db as unknown as ProcessOptions["db"],
      limit: 5,
      retryFailed: true,
    });

    expect(result.processed).toBe(5);
    expect(result.results.map(({ id }) => id)).toEqual([
      ...pending.map(({ id }) => id),
      retries[0]!.id,
    ]);
    expect(updateMany).toHaveBeenCalledTimes(5);
  });
});
