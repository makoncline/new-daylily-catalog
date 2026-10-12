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
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: vi.fn(async () => ({
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

    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const caller = createCaller(async () => {
      return {
        db: db as unknown as TRPCInternalContext["db"],
        headers: new Headers([["x-request-id", "request-1"]]),
        requestUrl: "https://daylilycatalog.com/api/trpc",
        oauthClientId: "client-1",
        oauthScope: "catalog:write",
        mcpToolName: "daylily.update_profile_content",
        _authUser: {
          id: "user-1",
          clerkUserId: "clerk-1",
          clerk: { email: "seller@example.com" },
        } as unknown as TRPCInternalContext["_authUser"],
      } satisfies TRPCInternalContext;
    });

    await caller.dashboardDb.userProfile.updateContent({
      content: "private profile draft",
      expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
    });

    const payload = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((row) => row.event === "user_mutation");

    expect(payload).toMatchObject({
      event: "user_mutation",
      status: "success",
      procedure: "dashboardDb.userProfile.updateContent",
      appUserId: "user-1",
      clerkUserId: "clerk-1",
      requestUrl: "https://daylilycatalog.com/api/trpc",
      oauthClientId: "client-1",
      oauthScope: "catalog:write",
      mcpToolName: "daylily.update_profile_content",
    });
    expect(payload?.correlation_id).toBeTypeOf("string");
    expect(payload?.content).toBeUndefined();
    expect(payload).not.toHaveProperty("email");
  });
});
