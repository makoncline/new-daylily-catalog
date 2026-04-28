import { describe, expect, it } from "vitest";
import {
  parseTableUrlColumnFilterValue,
  toTableUrlColumnFilterParamValue,
} from "@/lib/table-url-filters";

describe("table url filters", () => {
  it("parses lists params as array values", () => {
    expect(parseTableUrlColumnFilterValue("lists", "list-a")).toEqual([
      "list-a",
    ]);
    expect(parseTableUrlColumnFilterValue("lists", '"list-a"')).toEqual([
      "list-a",
    ]);
    expect(parseTableUrlColumnFilterValue("lists", "list-a,list-b")).toEqual([
      "list-a",
      "list-b",
    ]);
  });

  it("serializes string filter values without json quotes", () => {
    expect(toTableUrlColumnFilterParamValue("list-a")).toBe("list-a");
    expect(toTableUrlColumnFilterParamValue(["list-a", "list-b"])).toBe(
      "list-a,list-b",
    );
  });
});
