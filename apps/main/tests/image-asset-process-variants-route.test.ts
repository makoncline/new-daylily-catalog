// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/image-asset-process-variants-route.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";
process.env.CLERK_WEBHOOK_SECRET = "internal-secret";

const dbMock = vi.hoisted(() => ({}));
const processorMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: dbMock,
}));

vi.mock("@/server/services/image-asset-variant-processor", () => ({
  processPendingImageAssetVariants: processorMock,
}));

describe("image asset variant retry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processorMock.mockResolvedValue({ processed: 0, failed: 0, results: [] });
  });

  it("accepts an authenticated empty-body request with defaults", async () => {
    const { POST } = await import(
      "@/app/api/internal/image-assets/process-variants/route"
    );

    const response = await POST(
      new Request(
        "https://example.com/api/internal/image-assets/process-variants",
        {
          method: "POST",
          headers: { authorization: "Bearer internal-secret" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(processorMock).toHaveBeenCalledWith({
      db: dbMock,
      assetId: undefined,
      limit: undefined,
      retryFailed: false,
    });
  });
});
