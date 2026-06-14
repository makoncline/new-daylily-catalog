// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/user-action-audit.sqlite";

describe("user action audit logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs authenticated user mutation metadata without full content", async () => {
    const { createCaller } = await import("@/server/api/root");
    const db = {
      userProfile: {
        upsert: vi.fn(async () => ({
          id: "profile-1",
          userId: "user-1",
          title: null,
          slug: "user-1",
          logoUrl: null,
          description: null,
          content: "stored content",
          location: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        })),
      },
    };

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const caller = createCaller(async () => {
      return {
        db: db as unknown as TRPCInternalContext["db"],
        headers: new Headers([["x-request-id", "request-1"]]),
        requestUrl: "https://daylilycatalog.com/api/trpc",
        _authUser: {
          id: "user-1",
          clerkUserId: "clerk-1",
          clerk: { email: "seller@example.com" },
        } as unknown as TRPCInternalContext["_authUser"],
      } satisfies TRPCInternalContext;
    });

    await caller.dashboardDb.userProfile.updateContent({
      content: "private profile draft",
    });

    const payload = JSON.parse(String(infoSpy.mock.calls.at(-1)?.[0])) as {
      event: string;
      status: string;
      path: string;
      appUserId: string;
      clerkUserId: string;
      email: string;
      requestId: string;
      requestUrl: string;
      content?: string;
    };

    expect(payload).toMatchObject({
      event: "user_mutation",
      status: "success",
      path: "dashboardDb.userProfile.updateContent",
      appUserId: "user-1",
      clerkUserId: "clerk-1",
      email: "seller@example.com",
      requestId: "request-1",
      requestUrl: "https://daylilycatalog.com/api/trpc",
    });
    expect(payload.content).toBeUndefined();
  });
});
