import { describe, expect, it } from "vitest";
import { buildSelectedTagListingsForPrint } from "@/app/dashboard/tags/_components/tag-print-table";

const listings = [
  {
    id: "listing-1",
    userId: "user-1",
    title: "Moonlit Smile",
    price: 15,
    privateNote: "note-1",
    ahsListing: null,
    lists: [{ id: "list-1", title: "For Sale" }],
  },
  {
    id: "listing-2",
    userId: "user-1",
    title: "Solar Echo",
    price: 22,
    privateNote: "note-2",
    ahsListing: null,
    lists: [{ id: "list-2", title: "Garden Mix" }],
  },
  {
    id: "listing-3",
    userId: "user-1",
    title: "Starlit Path",
    price: 30,
    privateNote: "note-3",
    ahsListing: null,
    lists: [
      { id: "list-1", title: "For Sale" },
      { id: "list-3", title: "Featured" },
    ],
  },
];

describe("buildSelectedTagListingsForPrint", () => {
  it("returns selected listings from rowSelection ids in full-data order", () => {
    const selected = buildSelectedTagListingsForPrint({
      listings,
      rowSelection: {
        "listing-3": true,
        "listing-1": true,
      },
    });

    expect(selected.map((listing) => listing.id)).toEqual([
      "listing-1",
      "listing-3",
    ]);
  });

  it("formats list names and ignores ids not present in listings", () => {
    const selected = buildSelectedTagListingsForPrint({
      listings,
      rowSelection: {
        "listing-3": true,
        "missing-listing": true,
      },
    });

    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({
      id: "listing-3",
      title: "Starlit Path",
      listName: "For Sale, Featured",
    });
  });
});
