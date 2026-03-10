import { describe, expect, it } from "vitest";
import {
  applyOfferFiltersToSearchParams,
  parseOfferFilters,
} from "@/app/(public)/cultivar/[cultivarNormalizedName]/_components/cultivar-offers-utils";

describe("cultivar offer query-state helpers", () => {
  it("parses defaults when params are missing", () => {
    const filters = parseOfferFilters(new URLSearchParams());

    expect(filters).toEqual({
      sort: "best-match",
      forSaleOnly: false,
      hasPhotoOnly: false,
    });
  });

  it("parses explicit values", () => {
    const filters = parseOfferFilters(
      new URLSearchParams("offerSort=price-desc&offerForSale=1&offerHasPhoto=1"),
    );

    expect(filters).toEqual({
      sort: "price-desc",
      forSaleOnly: true,
      hasPhotoOnly: true,
    });
  });

  it("applies params and removes defaults", () => {
    const input = new URLSearchParams("utm_source=test");

    const updated = applyOfferFiltersToSearchParams(input, {
      sort: "updated-desc",
      forSaleOnly: true,
      hasPhotoOnly: false,
    });

    expect(updated.toString()).toBe("utm_source=test&offerSort=updated-desc&offerForSale=1");

    const reset = applyOfferFiltersToSearchParams(updated, {
      sort: "best-match",
      forSaleOnly: false,
      hasPhotoOnly: false,
    });

    expect(reset.toString()).toBe("utm_source=test");
  });
});
