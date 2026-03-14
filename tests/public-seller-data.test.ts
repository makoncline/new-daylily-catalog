// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getLatestDate } from "@/server/db/public-date-utils";

describe("public seller data", () => {
  it("accepts cache-serialized date values when computing latest seller freshness", () => {
    const result = getLatestDate(
      [
        "2026-01-10T00:00:00.000Z",
        new Date("2026-01-12T00:00:00.000Z"),
        null,
        undefined,
        "2026-01-11T00:00:00.000Z",
      ],
      "2026-01-01T00:00:00.000Z",
    );

    expect(result).toEqual(new Date("2026-01-12T00:00:00.000Z"));
  });
});
