// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getListingOwnerWithSlugsMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/getLegacyMappings", () => ({
  getListingOwnerWithSlugs: getListingOwnerWithSlugsMock,
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

describe("legacy redirect API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the canonical origin instead of the request host", async () => {
    getListingOwnerWithSlugsMock.mockResolvedValue({
      userId: "user-1",
      userSlug: "garden",
      listingSlug: "happy-returns",
    });

    const { GET } = await import("@/app/api/legacy-redirect/route");
    const response = await GET(
      new NextRequest(
        "https://evil.example/api/legacy-redirect?listingId=listing-1",
        {
          headers: {
            "x-forwarded-host": "evil.example",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://daylilycatalog.com/garden/happy-returns",
    );
  });

  it("uses the canonical origin for unresolved legacy listing ids", async () => {
    getListingOwnerWithSlugsMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/legacy-redirect/route");
    const response = await GET(
      new NextRequest("https://evil.example/api/legacy-redirect"),
    );

    expect(response.headers.get("location")).toBe(
      "https://daylilycatalog.com/catalogs",
    );
  });
});
