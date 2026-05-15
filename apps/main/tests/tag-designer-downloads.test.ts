import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/app/dashboard/tags/_components/tag-designer-downloads";

describe("tag designer downloads", () => {
  it("limits concurrent raster render work while preserving result order", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;

      return item * 10;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });
});
