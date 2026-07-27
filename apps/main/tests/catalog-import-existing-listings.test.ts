import { describe, expect, it } from "vitest";
import {
  getCatalogImportExistingListingDifferences,
  getCatalogImportExistingListingMatch,
  type CatalogImportComparableListing,
  type CatalogImportExistingListing,
} from "@/lib/catalog-import-existing-listings";

const incoming: CatalogImportComparableListing = {
  cultivarReferenceId: "cultivar-1",
  description: "Display row",
  price: 15,
  privateNote: "Front bed",
  title: "Happy Returns",
};

const existing: CatalogImportExistingListing = {
  ...incoming,
  id: "listing-1",
};

describe("catalog import existing-listing classification", () => {
  it("separates exact rows from same-cultivar rows with different data", () => {
    expect(getCatalogImportExistingListingMatch(incoming, [existing])).toEqual({
      kind: "exact",
      listings: [existing],
    });

    const changed = { ...existing, price: 18 };
    expect(getCatalogImportExistingListingMatch(incoming, [changed])).toEqual({
      kind: "possible",
      listings: [changed],
    });
    expect(
      getCatalogImportExistingListingDifferences(incoming, changed),
    ).toEqual(["price"]);
  });

  it("uses an exact normalized name only when one side has no cultivar link", () => {
    const unlinkedIncoming = { ...incoming, cultivarReferenceId: null };
    expect(
      getCatalogImportExistingListingMatch(unlinkedIncoming, [existing]).kind,
    ).toBe("possible");

    expect(
      getCatalogImportExistingListingMatch(incoming, [
        {
          ...existing,
          cultivarReferenceId: "cultivar-2",
        },
      ]),
    ).toEqual({ kind: "none", listings: [] });
  });
});
