import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  getCultivarSearchControls,
  parseCultivarSearchUrl,
  serializeCultivarSearchUrl,
} from "@/app/(public)/cultivars/_lib/cultivar-search-url";

describe("cultivar browser URL controls", () => {
  it("uses the same first values for Next search params and browser URLs", () => {
    const params = new URLSearchParams(
      "advanced=false&award=HM%7CAM%7CHM&award=ignored&bloomHabit=Diurnal&bloomSizeMax=6&bloomSizeMin=2&bloomSeason=Early&branchesMax=4&branchesMin=2&budCountMax=20&budCountMin=10&color=+gold+&cultivarName=+Bloom+&foliageType=Dormant&flowerShow=Large&form=Single&fragrance=Fragrant&hasCultivarPhoto=true&hasForSaleListings=true&hasListings=false&hybridizer=Stone%7CReed%7CStone&parentage=+Seedling+&ploidy=Diploid&q=+URL+Bloom+&q=ignored&rebloom=true&scapeHeightMax=40&scapeHeightMin=20&sculptedType=Pleated&sort=mostListed&yearMax=2026&yearMin=2000&photosFirst=true&offset=48&unknown=x",
    );
    const serverParams = Object.fromEntries(
      [...params.keys()].map((key) => [key, params.getAll(key)]),
    );
    const fromServer = parseCultivarSearchUrl((key) => serverParams[key]?.[0]);
    const fromBrowser = parseCultivarSearchUrl((key) => params.get(key));
    expect(fromServer).toEqual(fromBrowser);
    const controls = getCultivarSearchControls(fromServer);
    expect(serializeCultivarSearchUrl(controls)).toBe(
      "advanced=true&award=AM%7CHM&bloomHabit=Diurnal&bloomSeason=Early&bloomSizeMax=6&bloomSizeMin=2&branchesMax=4&branchesMin=2&budCountMax=20&budCountMin=10&color=gold&cultivarName=Bloom&flowerShow=Large&foliageType=Dormant&form=Single&fragrance=Fragrant&hasCultivarPhoto=true&hasForSaleListings=true&hasListings=false&hybridizer=Reed%7CStone&parentage=Seedling&ploidy=Diploid&q=URL+Bloom&rebloom=true&scapeHeightMax=40&scapeHeightMin=20&sculptedType=Pleated&sort=mostListed&yearMax=2026&yearMin=2000",
    );
    expect(controls.query).toBe(" URL Bloom ");
    expect(controls.filters.hybridizer).toBe("Stone|Reed|Stone");
  });

  it("preserves defaults, empty advanced inputs, and unvalidated range text", () => {
    const defaults = getCultivarSearchControls(
      parseCultivarSearchUrl(() => undefined),
    );
    expect(defaults).toEqual({
      advanced: false,
      filters: EMPTY_FILTERS,
      query: "",
      sort: "name",
    });
    expect(serializeCultivarSearchUrl(defaults)).toBe("");
    const params = new URLSearchParams(
      "advanced=1&color=&hasListings=0&hasCultivarPhoto=TRUE&hasForSaleListings=1&rebloom=false&yearMin=bad&sort=oldest&offset=24",
    );
    const controls = getCultivarSearchControls(
      parseCultivarSearchUrl((key) => params.get(key)),
    );
    expect(controls.advanced).toBe(true);
    expect(controls.filters.hasListings).toBe(true);
    expect(controls.filters.hasCultivarPhoto).toBe(false);
    expect(controls.filters.hasForSaleListings).toBe(false);
    expect(serializeCultivarSearchUrl(controls)).toBe(
      "advanced=true&yearMin=bad",
    );
  });
});
