import { describe, expect, it } from "vitest";
import {
  getCatalogImportExistingListingMatch,
  type CatalogImportComparableListing,
  type CatalogImportExistingListing,
} from "@/lib/catalog-import-existing-listings";

const incoming: CatalogImportComparableListing = {
  cultivarReferenceId: "cultivar-1",
  title: "Happy Returns",
  price: null,
  description: null,
  privateNote: null,
};

const existing: CatalogImportExistingListing = {
  ...incoming,
  id: "listing-1",
};

describe("catalog import existing-listing classification", () => {
  it("reuses only equivalent persisted sale details", () => {
    expect(getCatalogImportExistingListingMatch(incoming, [existing])).toEqual({
      kind: "duplicate",
      listings: [existing],
    });

    for (const details of [
      { price: 18 },
      { title: "Happy Returns single fan" },
      { description: "Two fans" },
      { privateNote: "North bed" },
    ]) {
      expect(
        getCatalogImportExistingListingMatch(incoming, [
          { ...existing, ...details },
        ]),
      ).toEqual({ kind: "none", listings: [] });
    }
  });

  it("keeps a different cultivar link distinct", () => {
    const unlinkedIncoming = { ...incoming, cultivarReferenceId: null };
    expect(
      getCatalogImportExistingListingMatch(unlinkedIncoming, [existing]).kind,
    ).toBe("none");

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
