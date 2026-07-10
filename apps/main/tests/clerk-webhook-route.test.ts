// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  event: {
    type: "user.deleted",
    data: { id: "user_deleted" },
  } as { data: Record<string, unknown>; type: string },
  captureEvent: vi.fn(),
  headers: new Headers({
    "svix-id": "msg_test",
    "svix-signature": "sig_test",
    "svix-timestamp": "1783616643",
  }),
  keyValueDeleteMany: vi.fn(),
  logUserAuth: vi.fn(),
  syncClerkUserToKV: vi.fn(),
  userUpsert: vi.fn(),
  verifyError: null as Error | null,
}));

vi.mock("@/env", () => ({
  env: { CLERK_WEBHOOK_SECRET: "clerk_webhook_secret" },
  requireEnv: (_name: string, value: string) => value,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => mocks.headers),
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify() {
      if (mocks.verifyError) throw mocks.verifyError;
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
  captureServerPosthogEvent: mocks.captureEvent,
}));

vi.mock("@/server/audit/user-action-audit", () => ({
  logUserAuth: mocks.logUserAuth,
}));

function request() {
  return new Request("https://daylilycatalog.com/api/clerk-webhook", {
    method: "POST",
    body: JSON.stringify(mocks.event),
  });
}

describe("Clerk webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.event = { type: "user.deleted", data: { id: "user_deleted" } };
    mocks.headers = new Headers({
      "svix-id": "msg_test",
      "svix-signature": "sig_test",
      "svix-timestamp": "1783616643",
    });
    mocks.verifyError = null;
    mocks.keyValueDeleteMany.mockResolvedValue({ count: 1 });
    mocks.syncClerkUserToKV.mockResolvedValue({ email: "user@example.com" });
    mocks.userUpsert.mockResolvedValue({ id: "app_user" });
  });

  it("rejects requests without the Svix headers", async () => {
    mocks.headers = new Headers();
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Error occurred -- no svix headers",
    });
    expect(mocks.userUpsert).not.toHaveBeenCalled();
  });

  it("rejects events that fail Svix verification", async () => {
    mocks.verifyError = new Error("invalid signature");
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Error occurred",
    });
    expect(mocks.userUpsert).not.toHaveBeenCalled();
  });

  it("creates and synchronizes a new user", async () => {
    mocks.event = { type: "user.created", data: { id: "user_created" } };
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.userUpsert).toHaveBeenCalledWith({
      where: { clerkUserId: "user_created" },
      create: { clerkUserId: "user_created" },
      update: {},
    });
    expect(mocks.syncClerkUserToKV).toHaveBeenCalledWith("user_created");
    expect(mocks.logUserAuth).toHaveBeenCalledWith({
      action: "signup",
      appUserId: "app_user",
      clerkUserId: "user_created",
      email: "user@example.com",
      source: "clerk-webhook",
    });
    expect(mocks.captureEvent).toHaveBeenCalledWith({
      distinctId: "user_created",
      event: "signup_completed",
      properties: {
        source: "clerk-webhook",
        source_page: "/api/clerk-webhook",
        user_id: "app_user",
      },
    });
  });

  it("uses the session user id for sign-in events", async () => {
    mocks.event = {
      type: "session.created",
      data: { id: "session_test", user_id: "user_session" },
    };
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.userUpsert).toHaveBeenCalledWith({
      where: { clerkUserId: "user_session" },
      create: { clerkUserId: "user_session" },
      update: {},
    });
    expect(mocks.logUserAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "signin",
        clerkUserId: "user_session",
      }),
    );
    expect(mocks.captureEvent).not.toHaveBeenCalled();
  });

  it("acknowledges a deleted user without recreating or refetching it", async () => {
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

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

  it("returns 500 when user processing fails", async () => {
    mocks.event = { type: "user.updated", data: { id: "user_error" } };
    mocks.userUpsert.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Error processing user",
    });
  });

  it("acknowledges irrelevant events without processing a user", async () => {
    mocks.event = {
      type: "email.created",
      data: { id: "email_test", user_id: "user_test" },
    };
    const { POST } = await import("@/app/api/clerk-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Webhook received",
    });
    expect(mocks.userUpsert).not.toHaveBeenCalled();
    expect(mocks.syncClerkUserToKV).not.toHaveBeenCalled();
  });
});
