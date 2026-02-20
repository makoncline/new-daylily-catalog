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

  it("skips route revalidation while the helper is globally disabled", async () => {
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

    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
