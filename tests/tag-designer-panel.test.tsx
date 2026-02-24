import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTagPrintDocumentHtml,
  createTagSheetDocumentHtml,
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

const multipleListings: TagListingData[] = [
  ...sampleListings,
  {
    id: "listing-2",
    title: "Solar Echo",
    price: 22,
    privateNote: "Display bed",
    listName: "Garden Mix",
    ahsListing: {
      hybridizer: "Jones",
      year: "2018",
      bloomSize: '7"',
      scapeHeight: '34"',
      bloomSeason: "M-L",
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
    expect(
      screen.getByRole("option", { name: /Brother TZe/i }),
    ).toBeInTheDocument();

    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    expect(screen.getByLabelText("Width (in)")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (in)")).toBeInTheDocument();
  });

  it("lets custom tag size inputs stay empty until blur", async () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const sizeSelect = screen.getByLabelText("Tag Size");
    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    const widthInput = screen.getByLabelText("Width (in)");
    const heightInput = screen.getByLabelText("Height (in)");

    fireEvent.change(widthInput, { target: { value: "" } });
    fireEvent.change(heightInput, { target: { value: "" } });
    expect(widthInput).toHaveValue(null);
    expect(heightInput).toHaveValue(null);

    fireEvent.change(widthInput, { target: { value: "4.2" } });
    fireEvent.change(heightInput, { target: { value: "1.75" } });
    fireEvent.blur(widthInput);
    fireEvent.blur(heightInput);

    await waitFor(() => {
      expect(widthInput).toHaveValue(4.2);
      expect(heightInput).toHaveValue(1.75);
      expect(screen.getByText('Active: 4.20" × 1.75"')).toBeInTheDocument();
    });
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

  it("opens sheet creator dialog from Make Sheet with one-tag defaults", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));

    expect(
      screen.getByRole("heading", { name: "Sheet Creator" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rows")).toHaveValue(1);
    expect(screen.getByLabelText("Columns")).toHaveValue(1);
    expect(
      screen.queryByLabelText("Copies of each selected label"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print quantity" }));
    expect(screen.getByLabelText("Copies of each selected label")).toHaveValue(1);
    expect(screen.getByLabelText("Page width (in)")).toHaveValue(3.5);
    expect(screen.getByLabelText("Page height (in)")).toHaveValue(1);
    expect(screen.getByLabelText("Print dashed borders")).not.toBeChecked();
    expect(
      screen.getByText("1 label selected, 1 copy of each, 1 total label."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sheet Preview" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print Sheets" })).toBeEnabled();
  });

  it("resets copies per label to 1 each time the sheet dialog opens", async () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Print quantity" }));
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "4" } });
    fireEvent.blur(copiesInput);
    expect(copiesInput).toHaveValue(4);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));
    const reopenedDialog = screen.getByRole("dialog");
    fireEvent.click(
      within(reopenedDialog).getByRole("button", { name: "Print quantity" }),
    );

    await waitFor(() => {
      expect(
        within(reopenedDialog).getByLabelText("Copies of each selected label"),
      ).toHaveValue(1);
    });
  });

  it("shows copy totals and groups the same label first in sheet preview", async () => {
    render(<TagDesignerPanel listings={multipleListings} />);

    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));
    const dialog = screen.getByRole("dialog");

    const columnsInput = within(dialog).getByLabelText("Columns");
    fireEvent.change(columnsInput, { target: { value: "2" } });
    fireEvent.blur(columnsInput);

    const pageWidthInput = within(dialog).getByLabelText("Page width (in)");
    fireEvent.change(pageWidthInput, { target: { value: "7" } });
    fireEvent.blur(pageWidthInput);

    fireEvent.click(within(dialog).getByRole("button", { name: "Print quantity" }));
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "2" } });
    fireEvent.blur(copiesInput);

    await waitFor(() => {
      expect(
        within(dialog).getByText(
          "2 labels selected, 2 copies of each, 4 total labels.",
        ),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(within(dialog).getAllByText("Moonlit Smile")).toHaveLength(2);
      expect(within(dialog).queryByText("Solar Echo")).not.toBeInTheDocument();
    });
  });

  it("defers commit for all sheet number fields until blur", () => {
    render(<TagDesignerPanel listings={sampleListings} />);
    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));
    const dialog = screen.getByRole("dialog");

    const scenarios = [
      { label: "Page width (in)", next: "4.25", expected: 4.25 },
      { label: "Page height (in)", next: "2.50", expected: 2.5 },
      { label: "Rows", next: "2", expected: 2 },
      { label: "Columns", next: "2", expected: 2 },
      { label: "Page margin X (in)", next: "0.10", expected: 0.1 },
      { label: "Page margin Y (in)", next: "0.10", expected: 0.1 },
      { label: "Tag padding X (in)", next: "0.05", expected: 0.05 },
      { label: "Tag padding Y (in)", next: "0.05", expected: 0.05 },
    ];

    for (const scenario of scenarios) {
      const input = within(dialog).getByLabelText(scenario.label);
      fireEvent.change(input, { target: { value: "" } });
      expect(input).toHaveValue(null);
      fireEvent.change(input, { target: { value: scenario.next } });
      expect(input).toHaveValue(Number(scenario.next));
      fireEvent.blur(input);
      expect(input).toHaveValue(scenario.expected);
    }

    fireEvent.click(within(dialog).getByRole("button", { name: "Print quantity" }));
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "" } });
    expect(copiesInput).toHaveValue(null);
    fireEvent.change(copiesInput, { target: { value: "3" } });
    fireEvent.blur(copiesInput);
    expect(copiesInput).toHaveValue(3);
  });

  it("defers numeric validation until blur and supports +/- buttons", () => {
    render(<TagDesignerPanel listings={sampleListings} />);
    fireEvent.click(screen.getByRole("button", { name: "Make Sheet" }));

    const rowsInput = screen.getByLabelText("Rows");
    fireEvent.change(rowsInput, { target: { value: "" } });
    expect(
      screen.queryByText(/Enter a whole number between 1 and 20/i),
    ).not.toBeInTheDocument();

    fireEvent.blur(rowsInput);
    expect(
      screen.getByText(/Enter a whole number between 1 and 20/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase Rows" }));
    expect(rowsInput).toHaveValue(2);
    expect(
      screen.queryByText(/Enter a whole number between 1 and 20/i),
    ).not.toBeInTheDocument();
  });

  it("lets cell option number inputs stay empty until blur", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const widthInput = screen.getAllByTitle("Column width (fr units)")[0]!;
    fireEvent.change(widthInput, { target: { value: "" } });
    expect(widthInput).toHaveValue(null);
    fireEvent.change(widthInput, { target: { value: "2" } });
    fireEvent.blur(widthInput);
    expect(widthInput).toHaveValue(2);

    const fontSizeInput = screen.getAllByTitle("Font size (px)")[0]!;
    fireEvent.change(fontSizeInput, { target: { value: "" } });
    expect(fontSizeInput).toHaveValue(null);
    fireEvent.change(fontSizeInput, { target: { value: "18" } });
    fireEvent.blur(fontSizeInput);
    expect(fontSizeInput).toHaveValue(18);
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

  it("renders sheet pages with configured rows and columns", () => {
    const html = createTagSheetDocumentHtml({
      tags: [
        {
          id: "tag-1",
          rows: [
            {
              id: "row-1",
              cells: [
                {
                  id: "cell-1",
                  text: "Moonlit Smile",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
        {
          id: "tag-2",
          rows: [
            {
              id: "row-2",
              cells: [
                {
                  id: "cell-2",
                  text: "Second Tag",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
        {
          id: "tag-3",
          rows: [
            {
              id: "row-3",
              cells: [
                {
                  id: "cell-3",
                  text: "Third Tag",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
      ],
      sheetState: {
        pageWidthInches: 7,
        pageHeightInches: 2,
        rows: 1,
        columns: 2,
        marginXInches: 0,
        marginYInches: 0,
        paddingXInches: 0,
        paddingYInches: 0,
        printDashedBorders: false,
      },
      tagWidthInches: 3.5,
      tagHeightInches: 1,
    });

    expect(html).not.toBeNull();
    expect(html).toContain("grid-template-columns: repeat(2, 3.5in)");
    expect(html).toContain("border: none");
    expect(html).toContain("Moonlit Smile");
    expect(html).toContain("Third Tag");
    expect(html?.match(/class=\"sheet-page\"/g)).toHaveLength(2);

    const htmlWithDashedBorders = createTagSheetDocumentHtml({
      tags: [],
      sheetState: {
        pageWidthInches: 3.5,
        pageHeightInches: 1,
        rows: 1,
        columns: 1,
        marginXInches: 0,
        marginYInches: 0,
        paddingXInches: 0,
        paddingYInches: 0,
        printDashedBorders: true,
      },
      tagWidthInches: 3.5,
      tagHeightInches: 1,
    });
    expect(htmlWithDashedBorders).toContain("border: 1px dashed #d4d4d8");
  });
});
