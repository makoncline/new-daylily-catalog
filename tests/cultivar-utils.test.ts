import { describe, expect, it } from "vitest";
import {
  fromCultivarRouteSegment,
  getCultivarRouteCandidates,
  normalizeCultivarName,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";

describe("cultivar route segment helpers", () => {
  it("slugifies normalized cultivar names for path usage", () => {
    expect(toCultivarRouteSegment(" Happy Returns ")).toBe("happy-returns");
    expect(toCultivarRouteSegment("A Cowgirl's Heart")).toBe("a-cowgirls-heart");
    expect(toCultivarRouteSegment("50,000 Watts")).toBe("50000-watts");
    expect(toCultivarRouteSegment("Aerial Appliqué")).toBe("aerial-applique");
  });

  it("normalizes hyphenated route segments back to cultivar names", () => {
    expect(fromCultivarRouteSegment("Happy-Returns")).toBe("happy returns");
  });

  it("builds candidates for both literal and hyphen-as-space variants", () => {
    expect(getCultivarRouteCandidates("blue-green")).toEqual([
      "blue-green",
      "blue green",
    ]);
  });

  it("adds possessive candidates for slug segments without apostrophes", () => {
    expect(getCultivarRouteCandidates("zundles-jubilee")).toEqual([
      "zundles-jubilee",
      "zundles jubilee",
      "zundle's jubilee",
    ]);
  });

  it("returns null for empty cultivar values", () => {
    expect(toCultivarRouteSegment("   ")).toBeNull();
    expect(fromCultivarRouteSegment("")).toBeNull();
    expect(normalizeCultivarName(null)).toBeNull();
  });
});
