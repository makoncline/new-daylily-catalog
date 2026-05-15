import { describe, expect, it } from "vitest";
import { buildResolvedRowsForListing } from "@/app/dashboard/tags/_components/tag-designer-model";
import type {
  TagListingData,
  TagRow,
} from "@/app/dashboard/tags/_components/tag-designer-model";

const listing: TagListingData = {
  id: "listing-1",
  title: "Moonlit Smile",
  price: 18.5,
  ahsListing: null,
};

function customTextCell(label: string): TagRow["cells"][number] {
  return {
    fieldId: "customText",
    width: 1,
    textAlign: "left",
    fontSize: 12,
    overflow: false,
    fit: true,
    wrap: false,
    bold: false,
    italic: false,
    underline: false,
    label,
  };
}

describe("tag designer model", () => {
  it("keeps resolved cell ids unique for repeated free-text cells", () => {
    const rows = buildResolvedRowsForListing(listing, [
      {
        id: "row-1",
        cells: [customTextCell("A"), customTextCell("B")],
      },
    ]);

    expect(rows[0]?.cells.map((cell) => cell.id)).toEqual([
      "listing-1-row-1-0-customText",
      "listing-1-row-1-1-customText",
    ]);
  });
});
