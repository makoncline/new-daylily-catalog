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
    upsert: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    userProfile: {
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

describe("dashboardDb.userProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes EditorJS content before storing it", async () => {
    const db = createMockDb();
    db.userProfile.upsert.mockImplementation(async (args) => ({
      id: "profile-1",
      userId: "user-1",
      title: null,
      slug: "user-1",
      logoUrl: null,
      description: null,
      content: args.create.content,
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

    await caller.updateContent({ content: unsafeContent });

    const upsertArgs = db.userProfile.upsert.mock.calls[0]?.[0] as {
      create: { content: string | null };
      update: { content: string | null };
    };
    expect(upsertArgs.create.content).toBe(upsertArgs.update.content);

    const stored = JSON.parse(upsertArgs.create.content ?? "{}") as {
      blocks: Array<{ data: { text: string } }>;
    };
    expect(stored.blocks[0]?.data.text).toBe("Hello <b>world</b>");
  });
});
