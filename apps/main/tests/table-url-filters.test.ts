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

  it("keeps string filters distinct from facet arrays", () => {
    expect(toTableUrlColumnFilterParamValue("list-a")).toBe('"list-a"');
    expect(toTableUrlColumnFilterParamValue(["list-a", "list-b"])).toBe(
      '["list-a","list-b"]',
    );
    const values = ["red, yellow", "123"];
    expect(
      parseTableUrlColumnFilterValue(
        "ploidy",
        toTableUrlColumnFilterParamValue(values),
      ),
    ).toEqual(values);
    expect(
      parseTableUrlColumnFilterValue(
        "lists",
        toTableUrlColumnFilterParamValue(values),
      ),
    ).toEqual(values);
  });
  it.each(["red, yellow", "123", "true", '["red"]'])(
    "preserves text filter %s through a URL round trip",
    (value) => {
      expect(
        parseTableUrlColumnFilterValue(
          "description",
          toTableUrlColumnFilterParamValue(value),
        ),
      ).toBe(value);
    },
  );
});
