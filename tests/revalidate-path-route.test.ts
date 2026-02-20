// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { GET, POST } from "@/app/api/admin/revalidate-path/route";

describe("/api/admin/revalidate-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("rejects suspicious path traversal segments", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const request = new Request(
      "https://daylilycatalog.test/api/admin/revalidate-path",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/cultivar/../dashboard" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects paths containing newline characters", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const request = new Request(
      "https://daylilycatalog.test/api/admin/revalidate-path",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/cultivar/coffee\n-frenzy" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns cache metadata for the requested current page", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: {
            "x-nextjs-cache": "HIT",
            "cache-control": "s-maxage=86400, stale-while-revalidate",
            date: "Fri, 20 Feb 2026 18:10:00 GMT",
            age: "120",
          },
        }),
      ),
    );

    const request = new Request(
      "https://daylilycatalog.test/api/admin/revalidate-path?path=%2Fcultivar%2Fcoffee-frenzy",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const payload = (await response.json()) as {
      ok: boolean;
      path: string;
      probeStatus: number;
      cacheStatus: string;
      cachedAtIso: string;
      cachedAtSource: string;
    };

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchMock = vi.mocked(fetch);
    const firstCall = fetchMock.mock.calls[0];

    expect(firstCall).toBeDefined();

    if (!firstCall) {
      throw new Error("Expected fetch to be called once");
    }

    const [requestUrl, requestInit] = firstCall;
    const requestUrlValue =
      typeof requestUrl === "string"
        ? requestUrl
        : requestUrl instanceof URL
          ? requestUrl.toString()
          : requestUrl.url;

    expect(requestUrlValue).toBe("https://daylilycatalog.test/cultivar/coffee-frenzy");
    expect(requestInit).toEqual({
      method: "HEAD",
      cache: "no-store",
      headers: {
        "x-admin-cache-probe": "1",
      },
    });
    expect(payload).toMatchObject({
      ok: true,
      path: "/cultivar/coffee-frenzy",
      probeStatus: 200,
      cacheStatus: "HIT",
      cachedAtIso: "2026-02-20T18:08:00.000Z",
      cachedAtSource: "date-age",
    });
  });
});
