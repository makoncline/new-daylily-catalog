// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { userRouter } from "@/server/api/routers/user";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/user-router-context.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

describe("user router context auth resolution", () => {
  it("returns preloaded user without calling resolver", async () => {
    const resolveUser = vi.fn();
    const preloadedUser = { id: "user-1", clerk: { email: "a@example.com" } };

    const caller = userRouter.createCaller({
      db: {} as never,
      headers: new Headers(),
      user: preloadedUser as never,
      resolveUser: resolveUser as never,
    });

    const result = await caller.getCurrentUser();

    expect(result).toEqual(preloadedUser);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it("resolves user lazily when not preloaded", async () => {
    const resolvedUser = { id: "user-2", clerk: { email: "b@example.com" } };
    const resolveUser = vi.fn().mockResolvedValue(resolvedUser);

    const caller = userRouter.createCaller({
      db: {} as never,
      headers: new Headers(),
      user: null,
      resolveUser: resolveUser as never,
    });

    const result = await caller.getCurrentUser();

    expect(resolveUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual(resolvedUser);
  });

  it("returns null when no user is available", async () => {
    const caller = userRouter.createCaller({
      db: {} as never,
      headers: new Headers(),
      user: null,
    });

    const result = await caller.getCurrentUser();

    expect(result).toBeNull();
  });
});
