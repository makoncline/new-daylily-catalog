// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { POST } from "@/app/api/admin/revalidate-path/route";

describe("POST /api/admin/revalidate-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request("https://daylilycatalog.test/api/admin/revalidate-path", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/cultivar/coffee-frenzy" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates a valid non-api path for authenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const request = new Request("https://daylilycatalog.test/api/admin/revalidate-path", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/cultivar/coffee-frenzy?utm_source=test" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      revalidatedPath: string;
    };

    expect(response.status).toBe(200);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/cultivar/coffee-frenzy");
    expect(payload).toEqual({
      ok: true,
      revalidatedPath: "/cultivar/coffee-frenzy",
    });
  });
});
