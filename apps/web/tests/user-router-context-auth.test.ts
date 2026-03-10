// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/user-router-context.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

const authMock = vi.hoisted(() => vi.fn(async () => ({ userId: null })));

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: authMock,
  };
});

type UserRouterModule = typeof import("@/server/api/routers/user");
let userRouter: UserRouterModule["userRouter"];

function createCallerContext(overrides: Partial<TRPCInternalContext> = {}) {
  return {
    db: {} as unknown as TRPCInternalContext["db"],
    headers: new Headers(),
    ...overrides,
  } satisfies TRPCInternalContext;
}

beforeEach(async () => {
  vi.clearAllMocks();
  ({ userRouter } = await import("@/server/api/routers/user"));
});

describe("user router context auth resolution", () => {
  it("returns preloaded user without calling auth", async () => {
    const preloadedUser = { id: "user-1", clerk: { email: "a@example.com" } };

    const caller = userRouter.createCaller(
      createCallerContext({
        _authUser:
          preloadedUser as unknown as TRPCInternalContext["_authUser"],
      }),
    );

    const result = await caller.getCurrentUser();

    expect(result).toEqual(preloadedUser);
    expect(authMock).not.toHaveBeenCalled();
  });

  it("throws unauthorized when user is missing", async () => {
    const caller = userRouter.createCaller(createCallerContext());

    await expect(caller.getCurrentUser()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(authMock).toHaveBeenCalledTimes(1);
  });

  it("treats preloaded null auth sentinel as resolved unauthenticated", async () => {
    const caller = userRouter.createCaller(
      createCallerContext({
        _authUser: null,
      }),
    );

    await expect(caller.getCurrentUser()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(authMock).not.toHaveBeenCalled();
  });
});
