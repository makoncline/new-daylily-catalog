// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchPublicCultivars } from "@/server/db/searchPublicCultivars";

const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/error-utils", () => ({
  reportError: (...args: unknown[]) => reportErrorMock(...args),
}));

describe("searchPublicCultivars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns routable results and falls back to normalized names when needed", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "ref-1",
        ahsId: "ahs-1",
        normalizedName: "coffee frenzy",
        ahsListing: {
          name: "Coffee Frenzy",
        },
      },
      {
        id: "ref-2",
        ahsId: "ahs-2",
        normalizedName: "coffee bean",
        ahsListing: {
          name: null,
        },
      },
      {
        id: "ref-3",
        ahsId: null,
        normalizedName: "coffee wave",
        ahsListing: {
          name: "Coffee Wave",
        },
      },
    ]);

    const db = {
      cultivarReference: {
        findMany,
      },
    } as never;

    const results = await searchPublicCultivars(db, "coffee", { take: 8 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
        where: expect.objectContaining({
          normalizedName: { startsWith: "coffee" },
        }),
      }),
    );

    expect(results).toEqual([
      {
        id: "ahs-1",
        name: "Coffee Frenzy",
        cultivarReferenceId: "ref-1",
        normalizedName: "coffee frenzy",
        segment: "coffee-frenzy",
      },
      {
        id: "ahs-2",
        name: "coffee bean",
        cultivarReferenceId: "ref-2",
        normalizedName: "coffee bean",
        segment: "coffee-bean",
      },
    ]);

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });
});
