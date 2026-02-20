// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { revalidatePublicCatalogRoutes } from "@/server/cache/revalidate-public-catalog-routes";

describe("revalidatePublicCatalogRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates canonical, legacy, and shared public catalog paths", async () => {
    const db = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ slug: "sunrise-daylilies" }),
      },
    };

    await revalidatePublicCatalogRoutes({
      db: db as never,
      userId: "user-123",
      additionalUserSegments: ["old-slug"],
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/sunrise-daylilies");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sunrise-daylilies/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/user-123");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/user-123/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/old-slug");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/old-slug/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/[userSlugOrId]/page/[page]",
      "page",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/cultivar/[cultivarNormalizedName]",
      "page",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/catalogs");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});
