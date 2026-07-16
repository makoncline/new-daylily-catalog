// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/trpc-route-auth-context.sqlite";

const requestScope = vi.hoisted(() => ({ active: false }));
const authMock = vi.hoisted(() =>
  vi.fn(async () => {
    if (!requestScope.active) {
      throw new Error(
        "Clerk: auth() was called outside a request scope: headers was called outside a request scope",
      );
    }

    return {
      isAuthenticated: true,
      userId: "clerk-user-1",
    };
  }),
);
const findUniqueMock = vi.hoisted(() =>
  vi.fn(async () => ({ id: "app-user-1" })),
);

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: authMock,
  };
});

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: findUniqueMock,
      upsert: vi.fn(),
    },
  },
  hasEmbeddedReplica: false,
  replicaDb: undefined,
}));

describe("authenticated tRPC route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestScope.active = false;
  });

  it("resolves Clerk authentication at the HTTP request boundary", async () => {
    const { GET } = await import("@/app/api/trpc/[trpc]/route");
    const request = new NextRequest(
      "http://localhost/api/trpc/dashboardDb.user.getCurrentUserId?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D",
    );

    requestScope.active = true;
    const responsePromise = GET(request);
    requestScope.active = false;

    const response = await responsePromise;
    const body = await response.json();

    expect(body).toMatchObject([
      {
        result: {
          data: {
            json: { id: "app-user-1" },
          },
        },
      },
    ]);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk-user-1" },
      select: { id: true },
    });
    expect(authMock).toHaveBeenCalledOnce();
    expect(authMock).toHaveBeenCalledWith({
      acceptsToken: ["session_token"],
    });
  });
});
