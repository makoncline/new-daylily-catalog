import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTagPrintDocumentHtml,
  TagDesignerPanel,
  type TagListingData,
} from "@/app/dashboard/tags/_components/tag-designer-panel";

const sampleListings: TagListingData[] = [
  {
    id: "listing-1",
    title: "Moonlit Smile",
    price: 18.5,
    privateNote: "Divisions from back bed",
    listName: "Spring Favorites",
    ahsListing: {
      hybridizer: "Smith",
      year: "2015",
      bloomSize: '6"',
      scapeHeight: '32"',
      bloomSeason: "M",
    },
  },
];

describe("TagDesignerPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows tag sizes in a select and reveals custom size inputs", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const sizeSelect = screen.getByLabelText("Tag Size");
    expect(sizeSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Brother TZe/i })).toBeInTheDocument();

    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    expect(screen.getByLabelText("Custom Width (in)")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom Height (in)")).toBeInTheDocument();
  });

  it("hides field settings when excluded and shows them when included", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    expect(document.getElementById("label-price")).toBeNull();
    expect(document.getElementById("slot-price")).toBeNull();

    fireEvent.click(document.getElementById("include-price")!);

    expect(document.getElementById("label-price")).not.toBeNull();
    expect(document.getElementById("slot-price")).not.toBeNull();
  });

  it("lets users include fields, customize labels, and persists design changes", async () => {
    const { unmount } = render(<TagDesignerPanel listings={sampleListings} />);

    expect(screen.queryByText("Price: $18.50")).not.toBeInTheDocument();

    const includePriceCheckbox = document.getElementById("include-price");
    expect(includePriceCheckbox).not.toBeNull();
    fireEvent.click(includePriceCheckbox!);

    expect(screen.getByText("Price: $18.50")).toBeInTheDocument();

    const labelPriceInput = document.getElementById("label-price");
    expect(labelPriceInput).not.toBeNull();
    fireEvent.change(labelPriceInput!, { target: { value: "Tag Price" } });

    expect(screen.getByText("Tag Price: $18.50")).toBeInTheDocument();

    unmount();

    render(<TagDesignerPanel listings={sampleListings} />);

    await waitFor(() => {
      expect(screen.getByText("Tag Price: $18.50")).toBeInTheDocument();
    });
  });
});

describe("createTagPrintDocumentHtml", () => {
  it("renders left and right slot lines with text-align in printable markup", () => {
    const html = createTagPrintDocumentHtml({
      widthInches: 3.5,
      heightInches: 1,
      tags: [
        {
          id: "tag-1",
          lines: [
            {
              id: "line-left",
              text: "Title: Moonlit Smile",
              slot: "left",
              textAlign: "left",
              fontSize: 12,
              bold: true,
              italic: false,
              underline: false,
            },
            {
              id: "line-right",
              text: "Price: $18.50",
              slot: "right",
              textAlign: "right",
              fontSize: 10,
              bold: false,
              italic: true,
              underline: true,
            },
          ],
        },
      ],
    });

    expect(html).toContain("tag-grid");
    expect(html).toContain("Title: Moonlit Smile");
    expect(html).toContain("Price: $18.50");
    expect(html).toContain("text-decoration: underline");
    expect(html).toContain("text-align: left");
    expect(html).toContain("text-align: right");
  });
});
