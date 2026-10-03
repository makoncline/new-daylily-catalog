// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-user-profile.sqlite";

type RouterModule =
  typeof import("@/server/api/routers/dashboard-db/user-profile");
let dashboardDbUserProfileRouter: RouterModule["dashboardDbUserProfileRouter"];

beforeAll(async () => {
  ({ dashboardDbUserProfileRouter } = await import(
    "@/server/api/routers/dashboard-db/user-profile"
  ));
});

interface MockDb {
  userProfile: {
    updateMany: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    userProfile: {
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
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

describe("dashboardDb.userProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes EditorJS content before storing it", async () => {
    const db = createMockDb();
    db.userProfile.updateMany.mockResolvedValue({ count: 1 });
    db.userProfile.findUniqueOrThrow.mockImplementation(async () => ({
      id: "profile-1",
      userId: "user-1",
      title: null,
      slug: "user-1",
      logoUrl: null,
      description: null,
      content: null,
      location: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    }));

    const caller = createCaller(db);
    const unsafeContent = JSON.stringify({
      time: 1,
      blocks: [
        {
          id: "paragraph-1",
          type: "paragraph",
          data: {
            text: `<img src=x onerror="alert(1)">Hello <b onclick="alert(1)">world</b>`,
          },
        },
      ],
      version: "2.30.0",
    });

    await caller.updateContent({
      content: unsafeContent,
      expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
    });

    const updateArgs = db.userProfile.updateMany.mock.calls[0]?.[0] as {
      data: { content: string | null };
      where: { updatedAt: Date };
    };
    expect(updateArgs.where.updatedAt.toISOString()).toBe(
      "2026-01-02T00:00:00.000Z",
    );

    const stored = JSON.parse(updateArgs.data.content ?? "{}") as {
      blocks: Array<{ data: { text: string } }>;
    };
    expect(stored.blocks[0]?.data.text).toBe("Hello <b>world</b>");
  });

  it("rejects content that exceeds the limit after sanitizing", async () => {
    const db = createMockDb();
    const caller = createCaller(db);
    const content = JSON.stringify({
      time: 1,
      blocks: [
        {
          id: "paragraph-1",
          type: "paragraph",
          data: { text: "&".repeat(8_100) },
        },
      ],
      version: "2.30.8",
    });

    await expect(
      caller.updateContent({
        content,
        expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.userProfile.updateMany).not.toHaveBeenCalled();
  });
});
