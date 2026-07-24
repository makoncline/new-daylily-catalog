// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-user-profile-slug.sqlite";

type RouterModule =
  typeof import("@/server/api/routers/dashboard-db/user-profile");
let dashboardDbUserProfileRouter: RouterModule["dashboardDbUserProfileRouter"];

beforeAll(async () => {
  ({ dashboardDbUserProfileRouter } = await import(
    "@/server/api/routers/dashboard-db/user-profile"
  ));
});

interface MockDb {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  userProfile: {
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    user: {
      findFirst: vi.fn(),
    },
    userProfile: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return dashboardDbUserProfileRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.userProfile slug namespace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects slugs that match another user's raw id", async () => {
    const db = createMockDb();
    db.userProfile.findFirst.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue({ id: "other-user-id" });

    const caller = createCaller(db);

    await expect(caller.checkSlug({ slug: "other-user-id" })).resolves.toEqual({
      available: false,
    });
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-user-id",
        NOT: {
          id: "user-1",
        },
      },
      select: { id: true },
    });
  });

  it("rejects reserved application routes before querying uniqueness", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    await expect(caller.checkSlug({ slug: "dashboard" })).resolves.toEqual({
      available: false,
    });
    await expect(
      caller.checkSlug({ slug: "daylily-database-software" }),
    ).resolves.toEqual({
      available: false,
    });
    await expect(
      caller.checkSlug({ slug: "sell-daylilies-online" }),
    ).resolves.toEqual({
      available: false,
    });
    expect(db.userProfile.findFirst).not.toHaveBeenCalled();
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("does not allow updates to shadow another user's raw id", async () => {
    const db = createMockDb();
    db.userProfile.findFirst.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue({ id: "other-user-id" });

    const caller = createCaller(db);

    await expect(
      caller.update({ data: { slug: "other-user-id" } }),
    ).rejects.toBeInstanceOf(TRPCError);
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
  });
});
