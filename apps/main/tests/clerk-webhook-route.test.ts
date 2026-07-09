// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  event: {
    type: "user.deleted",
    data: { id: "user_deleted" },
  },
  keyValueDeleteMany: vi.fn(),
  syncClerkUserToKV: vi.fn(),
  userUpsert: vi.fn(),
}));

vi.mock("@/env", () => ({
  env: { CLERK_WEBHOOK_SECRET: "clerk_webhook_secret" },
  requireEnv: (_name: string, value: string) => value,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () =>
    new Headers({
      "svix-id": "msg_test",
      "svix-signature": "sig_test",
      "svix-timestamp": "1783616643",
    }),
  ),
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify() {
      return mocks.event;
    }
  },
}));

vi.mock("@/server/db", () => ({
  db: {
    keyValue: { deleteMany: mocks.keyValueDeleteMany },
    user: { upsert: mocks.userUpsert },
  },
}));

vi.mock("@/server/clerk/sync-user", () => ({
  syncClerkUserToKV: mocks.syncClerkUserToKV,
}));

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: vi.fn(),
}));

vi.mock("@/server/audit/user-action-audit", () => ({
  logUserAuth: vi.fn(),
}));

describe("Clerk webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.keyValueDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("acknowledges a deleted user without recreating or refetching it", async () => {
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(
      new Request("https://daylilycatalog.com/api/clerk-webhook", {
        method: "POST",
        body: JSON.stringify(mocks.event),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Deleted user cache cleared successfully",
    });
    expect(mocks.keyValueDeleteMany).toHaveBeenCalledWith({
      where: { key: "clerk:user:user_deleted" },
    });
    expect(mocks.userUpsert).not.toHaveBeenCalled();
    expect(mocks.syncClerkUserToKV).not.toHaveBeenCalled();
  });
});
