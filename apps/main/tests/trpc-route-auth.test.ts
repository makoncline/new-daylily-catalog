// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/trpc-route-auth.sqlite";

const authMock = vi.hoisted(() => vi.fn(async () => ({ userId: null })));

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: authMock,
  };
});

function createBatchedQueryUrl(path: string) {
  const input = encodeURIComponent(
    JSON.stringify({
      0: {
        json: null,
        meta: {
          values: ["undefined"],
        },
      },
    }),
  );

  return `http://localhost:3000/api/trpc/${path}?batch=1&input=${input}`;
}

describe("tRPC route auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
  });

  it("rejects protected HTTP tRPC calls without relying on proxy auth", async () => {
    const { GET } = await import("@/app/api/trpc/[trpc]/route");
    const request = new NextRequest(createBatchedQueryUrl("user.getCurrentUser"));

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          json: expect.objectContaining({
            code: -32001,
            message: "Not authenticated",
          }),
        }),
      }),
    ]);
    expect(authMock).toHaveBeenCalledTimes(1);
  });
});
