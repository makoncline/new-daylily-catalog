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

  it("shows a single download button that is enabled when listings are selected", () => {
    const { rerender } = render(<TagDesignerPanel listings={[]} />);
    const disabledDownloadButton = screen.getByRole("button", {
      name: "Download",
    });
    expect(disabledDownloadButton).toBeDisabled();

    rerender(<TagDesignerPanel listings={sampleListings} />);
    const downloadButton = screen.getByRole("button", { name: "Download" });
    expect(downloadButton).toBeEnabled();
  });

  it("shows tag sizes in a select and reveals custom size inputs", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const sizeSelect = screen.getByLabelText("Tag Size");
    expect(sizeSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Brother TZe/i })).toBeInTheDocument();

    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    expect(screen.getByLabelText("Width (in)")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (in)")).toBeInTheDocument();
  });

  it("shows sample preview when no listings selected", () => {
    render(<TagDesignerPanel listings={[]} />);
    expect(screen.getByText("Sample Cultivar Name")).toBeInTheDocument();
    expect(
      screen.getByText("Sample preview — select listings below"),
    ).toBeInTheDocument();
  });

  it("shows selected listing data in preview and persists layout", async () => {
    const { unmount } = render(<TagDesignerPanel listings={sampleListings} />);

    expect(screen.getByText("Moonlit Smile")).toBeInTheDocument();
    expect(screen.getByText(/Smith/)).toBeInTheDocument();
    expect(screen.getByText(/2015/)).toBeInTheDocument();

    unmount();
    render(<TagDesignerPanel listings={sampleListings} />);

    await waitFor(() => {
      expect(screen.getByText("Moonlit Smile")).toBeInTheDocument();
    });
  });
});

describe("createTagPrintDocumentHtml", () => {
  it("renders row cells with text-align in printable markup", () => {
    const html = createTagPrintDocumentHtml({
      widthInches: 3.5,
      heightInches: 1,
      tags: [
        {
          id: "tag-1",
          rows: [
            {
              id: "row-1",
              cells: [
                {
                  id: "cell-1",
                  text: "Title: Moonlit Smile",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
                {
                  id: "cell-2",
                  text: "Price: $18.50",
                  width: 1,
                  textAlign: "right",
                  fontSize: 10,
                  bold: false,
                  italic: true,
                  underline: true,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(html).toContain("Title: Moonlit Smile");
    expect(html).toContain("Price: $18.50");
    expect(html).toContain("text-decoration: underline");
    expect(html).toContain("text-align: left");
    expect(html).toContain("text-align: right");
  });
});
