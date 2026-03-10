import { describe, expect, it } from "vitest";
import {
  getPublicProfilePagePath,
  hasNonPageProfileParams,
  parsePositiveInteger,
  toPublicCatalogSearchParams,
} from "@/lib/public-catalog-url-state";

describe("public catalog url state", () => {
  it("parses positive integer and falls back for invalid values", () => {
    expect(parsePositiveInteger("5", 1)).toBe(5);
    expect(parsePositiveInteger("0", 1)).toBe(1);
    expect(parsePositiveInteger("abc", 1)).toBe(1);
    expect(parsePositiveInteger(undefined, 2)).toBe(2);
  });

  it("detects non-page params", () => {
    expect(hasNonPageProfileParams(new URLSearchParams("page=2"))).toBe(false);
    expect(
      hasNonPageProfileParams(new URLSearchParams("page=2&query=test")),
    ).toBe(true);
  });

  it("builds canonical page paths and search params", () => {
    expect(getPublicProfilePagePath("grower", 1)).toBe("/grower");
    expect(getPublicProfilePagePath("grower", 3)).toBe("/grower?page=3");

    const params = toPublicCatalogSearchParams({
      page: "2",
      lists: ["a", "b"],
    });

    expect(params.get("page")).toBe("2");
    expect(params.getAll("lists")).toEqual(["a", "b"]);
  });
});
