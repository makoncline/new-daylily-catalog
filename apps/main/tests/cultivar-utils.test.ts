import { describe, expect, it } from "vitest";
import {
  fromCultivarRouteSegment,
  normalizeCultivarName,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";

describe("cultivar route segment helpers", () => {
  it("keeps simple space-only cultivar urls unchanged", () => {
    expect(toCultivarRouteSegment(" Happy Returns ")).toBe("happy-returns");
    expect(toCultivarRouteSegment("Coffee Frenzy")).toBe("coffee-frenzy");
    expect(toCultivarRouteSegment("Aerial Appliqué")).toBe("aerial-applique");
  });

  it("changes punctuation-bearing cultivar urls to exact escaped segments", () => {
    expect(toCultivarRouteSegment("A Cowgirl's Heart")).toBe(
      "a-cowgirl~27s-heart",
    );
    expect(toCultivarRouteSegment("All Saints` Episcopal Church")).toBe(
      "all-saints~27-episcopal-church",
    );
    expect(toCultivarRouteSegment("50,000 Watts")).toBe("50~2c000-watts");
    expect(toCultivarRouteSegment("Blue-Green")).toBe("blue~2dgreen");
  });

  it("decodes exact cultivar route segments back to normalized names", () => {
    expect(fromCultivarRouteSegment("happy-returns")).toBe("happy returns");
    expect(fromCultivarRouteSegment("a-cowgirl~27s-heart")).toBe(
      "a cowgirl's heart",
    );
    expect(fromCultivarRouteSegment("all-saints~27-episcopal-church")).toBe(
      "all saints' episcopal church",
    );
    expect(fromCultivarRouteSegment("50~2c000-watts")).toBe("50,000 watts");
    expect(fromCultivarRouteSegment("blue~2dgreen")).toBe("blue-green");
  });

  it("returns null for empty or malformed cultivar route segments", () => {
    expect(toCultivarRouteSegment("   ")).toBeNull();
    expect(fromCultivarRouteSegment("")).toBeNull();
    expect(fromCultivarRouteSegment("Happy-Returns")).toBeNull();
    expect(fromCultivarRouteSegment("happy returns")).toBeNull();
    expect(fromCultivarRouteSegment("happy~zzreturns")).toBeNull();
    expect(normalizeCultivarName(null)).toBeNull();
  });

  it("normalizes backticks to apostrophes in canonical cultivar names", () => {
    expect(normalizeCultivarName("All Saints` Episcopal Church")).toBe(
      "all saints' episcopal church",
    );
    expect(normalizeCultivarName("Peach `n Cherry Jubilee")).toBe(
      "peach 'n cherry jubilee",
    );
  });
});
