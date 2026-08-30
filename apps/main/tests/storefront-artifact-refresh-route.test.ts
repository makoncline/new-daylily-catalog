// @vitest-environment node

import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/storefront-artifact-refresh-route.sqlite";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://images.example";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_example";

const REFRESH_TOKEN = Buffer.alloc(32, 1).toString("base64url");
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/env", () => ({
  env: {
    get STOREFRONT_ARTIFACT_REFRESH_TOKEN() {
      return process.env.STOREFRONT_ARTIFACT_REFRESH_TOKEN;
    },
  },
}));

vi.mock("@/server/storefront/public-storefront-refresh", () => ({
  refreshPublicStorefrontArtifacts: refreshMock,
}));

function createRequest(token = REFRESH_TOKEN) {
  return new Request(
    "http://127.0.0.1:3000/api/internal/storefront-artifacts/refresh",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    },
  );
}

describe("storefront artifact refresh trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STOREFRONT_ARTIFACT_REFRESH_TOKEN = REFRESH_TOKEN;
    refreshMock.mockResolvedValue({
      generatedAt: "2026-08-29T20:00:00.000Z",
      outputRoot: "/data/storefronts",
      ready: true,
      removedArtifacts: 0,
      sellers: [
        {
          artifact: "seller-3.json",
          byteLength: 123,
          id: "3",
        },
      ],
      warnings: [],
    });
  });

  it("authenticates before it refreshes and returns a private seller receipt", async () => {
    const { POST } = await import(
      "@/app/api/internal/storefront-artifacts/refresh/route"
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      generatedAt: "2026-08-29T20:00:00.000Z",
      sellers: ["3"],
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed configuration and bearer tokens before refresh work", async () => {
    const { POST } = await import(
      "@/app/api/internal/storefront-artifacts/refresh/route"
    );
    const invalidCases = [
      { configured: undefined, provided: REFRESH_TOKEN, status: 503 },
      {
        configured: `${REFRESH_TOKEN}=`,
        provided: REFRESH_TOKEN,
        status: 503,
      },
      {
        configured: Buffer.alloc(31, 1).toString("base64url"),
        provided: REFRESH_TOKEN,
        status: 503,
      },
      { configured: REFRESH_TOKEN, provided: "wrong-token", status: 401 },
      { configured: REFRESH_TOKEN, provided: `${REFRESH_TOKEN}=`, status: 401 },
    ] as const;

    for (const testCase of invalidCases) {
      if (testCase.configured === undefined) {
        delete process.env.STOREFRONT_ARTIFACT_REFRESH_TOKEN;
      } else {
        process.env.STOREFRONT_ARTIFACT_REFRESH_TOKEN = testCase.configured;
      }

      const response = await POST(createRequest(testCase.provided));

      expect(response.status).toBe(testCase.status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      if (testCase.status === 401) {
        expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
      }
    }

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("rejects non-loopback and query-bearing requests before refresh work", async () => {
    const { POST } = await import(
      "@/app/api/internal/storefront-artifacts/refresh/route"
    );

    for (const url of [
      "https://daylilycatalog.com/api/internal/storefront-artifacts/refresh",
      "http://127.0.0.1:3000/api/internal/storefront-artifacts/refresh?force=1",
    ]) {
      const response = await POST(
        new Request(url, {
          method: "POST",
          headers: { authorization: `Bearer ${REFRESH_TOKEN}` },
        }),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("returns a private failure without exposing refresh details", async () => {
    const { POST } = await import(
      "@/app/api/internal/storefront-artifacts/refresh/route"
    );
    refreshMock.mockRejectedValue(new Error("sensitive artifact path"));

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "storefront_artifact_refresh_failed",
    });
  });
});
