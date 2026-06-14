import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/public-cache-revalidate-route-test.sqlite";
process.env.CLERK_WEBHOOK_SECRET = "test-secret";

describe("public cache revalidate route", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    revalidateTagMock.mockClear();
  });

  it("rejects requests without the internal bearer token", async () => {
    const { POST } = await import(
      "@/app/api/internal/public-cache-revalidate/route"
    );

    const response = await POST(
      new Request("https://daylilycatalog.com/api/internal/public-cache-revalidate", {
        method: "POST",
        body: JSON.stringify({ paths: [], tags: [] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidates requested paths and tags", async () => {
    const { POST } = await import(
      "@/app/api/internal/public-cache-revalidate/route"
    );

    const response = await POST(
      new Request("https://daylilycatalog.com/api/internal/public-cache-revalidate", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
        body: JSON.stringify({
          source: "image-assets.variants",
          paths: [{ path: "/garden-slug" }, { path: "/catalogs", type: "page" }],
          tags: [{ tag: "public:listings:card:listing-1" }],
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      revalidated: true,
      paths: 2,
      tags: 1,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/garden-slug");
    expect(revalidatePathMock).toHaveBeenCalledWith("/catalogs", "page");
    expect(revalidateTagMock).toHaveBeenCalledWith(
      "public:listings:card:listing-1",
      "max",
    );
  });
});
